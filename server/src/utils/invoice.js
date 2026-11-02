const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const net = require('net');
const cloudinary = require('../config/cloudinary');

const FOREST = '#103D29';
const PRIMARY = '#174B32';
const SAGE = '#EAF1E7';
const LIGHT = '#F4F8F2';
const WHITE = '#FFFFFF';
const MAIN = '#26352D';
const SECONDARY = '#718078';
const BORDER = '#DCE5DC';

const SERVER_DIR = path.join(__dirname, '..', '..');
const CLIENT_PUBLIC_DIR = path.join(SERVER_DIR, '..', 'client', 'public');
const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads');
const LOGO_PATH = path.join(CLIENT_PUBLIC_DIR, 'images', 'greenmart-logo.png');
const BASKET_PATH = path.join(CLIENT_PUBLIC_DIR, 'images', 'banners', 'hero-basket.jpg');

function getInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const year = order.createdAt ? new Date(order.createdAt).getFullYear() : new Date().getFullYear();
  const id = order.orderNumber || String(order._id).slice(-8).toUpperCase();
  return `GM-INV-${year}-${id}`;
}

function formatINR(amount) {
  return 'Rs ' + Number(amount || 0).toLocaleString('en-IN');
}

function isWithinDirectory(filePath, directory) {
  const relativePath = path.relative(directory, filePath);
  return relativePath !== '' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath);
}

const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_REDIRECTS = 3;
const PRODUCT_IMAGE_TIMEOUT_MS = 3000;

function getCloudinaryHosts() {
  const hosts = new Set(['res.cloudinary.com']);
  const config = cloudinary.config();
  for (const hostValue of [config.secure_distribution, config.cname]) {
    if (typeof hostValue !== 'string' || !hostValue.trim()) continue;
    try {
      const parsed = new URL(hostValue.includes('://') ? hostValue : `https://${hostValue}`);
      const hostname = parsed.hostname.toLowerCase();
      const address = hostname.replace(/^\[|\]$/g, '');
      const isLocalHost = hostname === 'localhost' || /\.(?:localhost|local|internal)$/.test(hostname);
      if (
        parsed.protocol === 'https:' &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port &&
        !net.isIP(address) &&
        !isLocalHost
      ) {
        hosts.add(hostname);
      }
    } catch {
      continue;
    }
  }
  return hosts;
}

function validateCloudinaryImageUrl(value, { redirect = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { reason: 'invalid-url', hostname: null };
  }

  const hosts = getCloudinaryHosts();
  const hostname = url.hostname.toLowerCase();
  if (!hosts.has(hostname) || url.username || url.password || url.port) {
    return { reason: 'untrusted-provider', hostname };
  }
  if (url.protocol === 'http:' && !redirect) {
    url.protocol = 'https:';
  } else if (url.protocol !== 'https:') {
    return { reason: 'insecure-url', hostname };
  }

  if (redirect) return { url, hostname };

  const pathParts = url.pathname.split('/').filter(Boolean);
  const imageIndex = pathParts.findIndex((part, index) => part === 'image' && pathParts[index + 1] === 'upload');
  if (imageIndex < 0 || imageIndex > 1) {
    return { reason: 'unsupported-image-path', hostname };
  }
  return { url, hostname };
}

function getImageFormat(image) {
  if (image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
  if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (
    image.length >= 12 &&
    image.toString('ascii', 0, 4) === 'RIFF' &&
    image.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  if (image.length >= 12 && image.toString('ascii', 4, 8) === 'ftyp') {
    const brands = image.toString('ascii', 8, 12);
    if (brands === 'avif' || brands === 'avis') return 'avif';
  }
  return null;
}

function getCloudinaryJpegUrl(url) {
  const converted = new URL(url);
  const pathParts = converted.pathname.split('/');
  const uploadIndex = pathParts.findIndex((part, index) => part === 'upload' && pathParts[index - 1] === 'image');
  if (uploadIndex < 0 || pathParts.slice(uploadIndex + 1).some((part) => /^s--[^/]+--$/.test(part))) {
    return null;
  }

  let hasFormat = false;
  for (let index = uploadIndex + 1; index < pathParts.length; index += 1) {
    const tokens = pathParts[index].split(',');
    pathParts[index] = tokens.map((token) => {
      if (/^f_(?:auto|webp|avif|png|jpe?g)$/i.test(token)) {
        hasFormat = true;
        return 'f_jpg';
      }
      return token;
    }).join(',');
  }
  if (!hasFormat) pathParts.splice(uploadIndex + 1, 0, 'f_jpg');
  converted.pathname = pathParts.join('/');
  return converted;
}

function fetchCloudinaryImage(url, redirects = 0, deadline = Date.now() + PRODUCT_IMAGE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    let overallTimeout;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimeout);
      resolve(result);
    };
    const hostname = url.hostname.toLowerCase();
    const remainingTime = deadline - Date.now();
    if (remainingTime <= 0) {
      finish({ reason: 'timeout', hostname });
      return;
    }

    let request;
    try {
      request = https.get(url, { headers: { Accept: 'image/jpeg,image/png' } }, (response) => {
        const statusCode = Number(response.statusCode) || 0;
        if ([301, 302, 303, 307, 308].includes(statusCode)) {
          const location = response.headers.location;
          response.resume();
          if (typeof location !== 'string' || redirects >= MAX_IMAGE_REDIRECTS) {
            finish({ reason: location ? 'too-many-redirects' : 'redirect-without-location', hostname, statusCode });
            return;
          }
          let redirectUrl;
          try {
            redirectUrl = new URL(location, url).toString();
          } catch {
            finish({ reason: 'invalid-redirect', hostname, statusCode });
            return;
          }
          const redirected = validateCloudinaryImageUrl(redirectUrl, { redirect: true });
          if (!redirected.url) {
            finish({ reason: 'untrusted-redirect', hostname: redirected.hostname || hostname, statusCode });
            return;
          }
          fetchCloudinaryImage(redirected.url, redirects + 1, deadline).then(finish);
          return;
        }

        const contentType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
        const contentLength = Number(response.headers['content-length']);
        if (statusCode !== 200) {
          response.resume();
          finish({ reason: 'http-error', hostname, statusCode, contentType });
          return;
        }
        if (Number.isFinite(contentLength) && contentLength > MAX_PRODUCT_IMAGE_BYTES) {
          response.resume();
          finish({ reason: 'image-too-large', hostname, statusCode, contentType });
          return;
        }

        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_PRODUCT_IMAGE_BYTES) {
            finish({ reason: 'image-too-large', hostname, statusCode, contentType });
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          const image = Buffer.concat(chunks);
          const format = getImageFormat(image);
          if (format === 'jpeg' || format === 'png') {
            finish({ image, format, hostname, statusCode, contentType });
          } else {
            finish({
              reason: format ? 'unsupported-image-format' : 'invalid-image-data',
              format,
              hostname,
              statusCode,
              contentType,
            });
          }
        });
        response.on('aborted', () => finish({ reason: 'incomplete-download', hostname, statusCode, contentType }));
        response.on('error', () => finish({ reason: 'download-failed', hostname, statusCode, contentType }));
      });
    } catch {
      finish({ reason: 'request-failed', hostname });
      return;
    }

    const handleTimeout = () => {
      finish({ reason: 'timeout', hostname });
      request.destroy();
    };
    request.setTimeout(remainingTime, handleTimeout);
    overallTimeout = setTimeout(handleTimeout, remainingTime);
    request.on('error', (error) => {
      finish({ reason: error.code === 'ETIMEDOUT' ? 'timeout' : 'download-failed', hostname });
    });
  });
}

function logImageFailure(order, orderItem, row, detail) {
  const product = orderItem?.product && typeof orderItem.product === 'object' ? orderItem.product : null;
  const productId = product?._id || orderItem?.product || null;
  console.warn('Invoice product image unavailable', JSON.stringify({
    orderId: String(order?._id || order?.orderNumber || 'unknown'),
    productId: productId ? String(productId) : null,
    productName: String(orderItem?.name || product?.name || 'Product'),
    imageHost: detail?.hostname || null,
    category: detail?.reason || 'unknown',
    ...(detail?.statusCode ? { httpStatus: detail.statusCode } : {}),
    row: row + 1,
  }));
}

async function resolveProductImage(order, orderItem, row) {
  if (!orderItem) {
    logImageFailure(order, orderItem, row, { reason: 'missing-order-item' });
    return null;
  }
  const product = orderItem.product && typeof orderItem.product === 'object' ? orderItem.product : null;
  const refs = [
    orderItem.image,
    ...(Array.isArray(orderItem.images) ? orderItem.images : [orderItem.images]),
    ...(Array.isArray(product?.images) ? product.images : [product?.images]),
    product?.image,
  ];
  let lastFailure = { reason: 'missing-image-reference', hostname: null };

  for (const ref of refs) {
    if (typeof ref !== 'string' || !ref.trim()) continue;
    const value = ref.trim();
    if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(value)) {
      const validated = validateCloudinaryImageUrl(value.startsWith('//') ? `https:${value}` : value);
      if (!validated.url) {
        lastFailure = validated;
        continue;
      }
      let result = await fetchCloudinaryImage(validated.url);
      if (result.image) return result.image;

      if (result.reason === 'unsupported-image-format') {
        const jpegUrl = getCloudinaryJpegUrl(validated.url);
        if (jpegUrl) {
          result = await fetchCloudinaryImage(jpegUrl);
          if (result.image) return result.image;
        } else {
          result = { ...result, reason: 'unsupported-format-conversion' };
        }
      }
      lastFailure = result;
      continue;
    }

    const candidates = [];
    if (path.isAbsolute(value)) candidates.push(value);
    const relativePath = value.replace(/^[/\\]+/, '');
    if (relativePath) {
      candidates.push(path.resolve(UPLOADS_DIR, relativePath));
      candidates.push(path.resolve(CLIENT_PUBLIC_DIR, relativePath));
      if (relativePath.startsWith('uploads/')) {
        candidates.push(path.resolve(SERVER_DIR, relativePath));
      }
    }

    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (!isWithinDirectory(resolved, UPLOADS_DIR) && !isWithinDirectory(resolved, CLIENT_PUBLIC_DIR)) continue;
      try {
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue;
        if (fs.statSync(resolved).size > MAX_PRODUCT_IMAGE_BYTES) {
          lastFailure = { reason: 'image-too-large', hostname: null };
          continue;
        }
        const image = fs.readFileSync(resolved);
        const format = getImageFormat(image);
        if (format === 'jpeg' || format === 'png') return image;
        lastFailure = { reason: format ? 'unsupported-local-image-format' : 'invalid-local-image-data', hostname: null };
      } catch {
        lastFailure = { reason: 'local-file-unavailable', hostname: null };
      }
    }
  }
  logImageFailure(order, orderItem, row, lastFailure);
  return null;
}

function roundedRect(doc, x, y, w, h, r, fill, stroke) {
  doc.save();
  if (fill) doc.roundedRect(x, y, w, h, r).fill(fill);
  if (stroke) {
    doc.roundedRect(x, y, w, h, r).lineWidth(0.65).strokeColor(stroke).stroke();
  }
  doc.restore();
}

function drawProductImagePlaceholder(doc, x, y) {
  roundedRect(doc, x, y, 40, 40, 5, '#F1F3F1', '#D6DDD7');
  doc.save();
  doc.strokeColor('#AAB5AE').lineWidth(1);
  doc.roundedRect(x + 10, y + 7, 20, 17, 2).stroke();
  doc.circle(x + 24, y + 12, 2).stroke();
  doc.moveTo(x + 12, y + 22).lineTo(x + 18, y + 16).lineTo(x + 22, y + 20).lineTo(x + 25, y + 17).lineTo(x + 29, y + 22).stroke();
  doc.font('Helvetica').fontSize(4.5).fillColor(SECONDARY).text('Image unavailable', x + 2, y + 29, {
    width: 36,
    align: 'center',
    lineBreak: false,
  });
  doc.restore();
}

function drawIcon(doc, x, y, size, icon, color = PRIMARY) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.save();
  doc.strokeColor(color).fillColor(color).lineWidth(1.35).lineCap('round').lineJoin('round');

  if (icon === 'user') {
    doc.circle(cx, cy - 3, 3).fill();
    doc.moveTo(cx - 6, cy + 6).lineTo(cx - 5, cy + 2).quadraticCurveTo(cx, cy - 1, cx + 5, cy + 2).lineTo(cx + 6, cy + 6).closePath().fill();
  } else if (icon === 'file') {
    doc.roundedRect(cx - 5, cy - 7, 10, 14, 1.5).stroke();
    doc.moveTo(cx - 2.5, cy - 2).lineTo(cx + 2.5, cy - 2).moveTo(cx - 2.5, cy + 1).lineTo(cx + 2.5, cy + 1).moveTo(cx - 2.5, cy + 4).lineTo(cx + 2.5, cy + 4).stroke();
    doc.moveTo(cx - 2, cy - 8).lineTo(cx + 2, cy - 8).stroke();
  } else if (icon === 'package') {
    doc.moveTo(cx, cy - 6).lineTo(cx + 7, cy - 2).lineTo(cx + 7, cy + 4).lineTo(cx, cy + 8).lineTo(cx - 7, cy + 4).lineTo(cx - 7, cy - 2).closePath().stroke();
    doc.moveTo(cx - 7, cy - 2).lineTo(cx, cy + 2).lineTo(cx + 7, cy - 2).moveTo(cx, cy + 2).lineTo(cx, cy + 8).stroke();
  } else if (icon === 'card') {
    doc.roundedRect(cx - 7, cy - 5, 14, 10, 1.5).stroke();
    doc.moveTo(cx - 6, cy - 1).lineTo(cx + 6, cy - 1).moveTo(cx - 4, cy + 2).lineTo(cx - 1, cy + 2).stroke();
  } else if (icon === 'receipt') {
    doc.moveTo(cx - 5, cy - 7).lineTo(cx + 5, cy - 7).lineTo(cx + 5, cy + 7).lineTo(cx + 2, cy + 5).lineTo(cx, cy + 7).lineTo(cx - 2, cy + 5).lineTo(cx - 5, cy + 7).closePath().stroke();
    doc.moveTo(cx - 2.5, cy - 3).lineTo(cx + 2.5, cy - 3).moveTo(cx - 2.5, cy).lineTo(cx + 2.5, cy).moveTo(cx - 2.5, cy + 3).lineTo(cx + 1, cy + 3).stroke();
  } else if (icon === 'leaf' || icon === 'organic') {
    doc.moveTo(cx - 5, cy + 6).bezierCurveTo(cx - 5, cy - 1, cx - 1, cy - 7, cx + 6, cy - 7).bezierCurveTo(cx + 6, cy, cx + 3, cy + 5, cx - 5, cy + 6).closePath().fill();
    doc.strokeColor(WHITE).lineWidth(0.8).moveTo(cx - 4, cy + 5).lineTo(cx + 4, cy - 5).stroke();
  } else if (icon === 'farmers') {
    doc.circle(cx - 3, cy - 2, 2.2).stroke();
    doc.circle(cx + 3, cy - 2, 2.2).stroke();
    doc.moveTo(cx - 7, cy + 6).quadraticCurveTo(cx - 6, cy + 1, cx - 2, cy + 1).moveTo(cx + 7, cy + 6).quadraticCurveTo(cx + 6, cy + 1, cx + 2, cy + 1).moveTo(cx - 2, cy + 6).quadraticCurveTo(cx, cy + 1, cx + 2, cy + 6).stroke();
  } else if (icon === 'secure') {
    doc.moveTo(cx, cy - 7).lineTo(cx + 6, cy - 4).lineTo(cx + 5, cy + 2).quadraticCurveTo(cx + 3, cy + 6, cx, cy + 8).quadraticCurveTo(cx - 3, cy + 6, cx - 5, cy + 2).lineTo(cx - 6, cy - 4).closePath().stroke();
    doc.moveTo(cx - 2.5, cy).lineTo(cx - 0.5, cy + 2).lineTo(cx + 3, cy - 2).stroke();
  } else if (icon === 'truck') {
    doc.roundedRect(cx - 8, cy - 4, 10, 7, 1).stroke();
    doc.moveTo(cx + 2, cy - 2).lineTo(cx + 5, cy - 2).lineTo(cx + 8, cy + 1).lineTo(cx + 8, cy + 3).lineTo(cx + 2, cy + 3).stroke();
    doc.circle(cx - 4, cy + 4, 1.5).fill();
    doc.circle(cx + 5, cy + 4, 1.5).fill();
  }
  doc.restore();
}

function drawSectionHeader(doc, x, y, w, title, icon) {
  roundedRect(doc, x, y, w, 34, 8, SAGE, BORDER);
  drawIcon(doc, x + 14, y + 8, 18, icon);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(FOREST).text(title, x + 42, y + 10, { lineBreak: false });
}

function getTextHeight(doc, text, width, fontSize, font = 'Helvetica') {
  doc.font(font).fontSize(fontSize);
  return doc.heightOfString(String(text || ''), { width, fontSize, lineGap: 1 });
}

async function generateInvoicePDF(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const productImages = await Promise.all(items.map((item, index) => resolveProductImage(order, item, index)));
  const doc = new PDFDocument({ margin: 0, size: 'A4', compress: true, bufferPages: true });
  const invoiceNumber = getInvoiceNumber(order);
  const invoiceDate = order.invoiceGeneratedAt || order.createdAt ? new Date(order.invoiceGeneratedAt || order.createdAt) : new Date();
  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const M = 20;
  const CONTENT_W = PAGE_W - M * 2;
  const FOOTER_H = 142;
  const FOOTER_Y = PAGE_H - FOOTER_H;
  const addr = order.address || {};
  const customerName = addr.name || order.user?.name || '';
  const paymentMethod = order.paymentMethod || 'Not recorded';
  const orderId = order.orderNumber || String(order._id || '');
  const subtotalFromItems = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const subtotal = order.subtotal == null ? subtotalFromItems : Number(order.subtotal) || 0;
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;
  const calculatedTotal = subtotal + deliveryCharge - discount + tax;
  const grandTotal = order.total == null ? calculatedTotal : Number(order.total) || 0;

  function drawHeader() {
    const headerY = 20;
    const dividerX = 211;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, M + 3, headerY + 1, { fit: [137, 96], align: 'center', valign: 'center' });
    } else {
      doc.font('Helvetica-Bold').fontSize(22).fillColor(FOREST).text('GreenMart', M + 6, headerY + 20);
      doc.font('Helvetica').fontSize(8).fillColor(PRIMARY).text('Organic Products E-Commerce', M + 6, headerY + 49);
    }
    doc.font('Helvetica').fontSize(7.7).fillColor(SECONDARY).text('Fresh. Organic. Direct from Farmers.', M + 7, 120, { width: 176 });
    doc.strokeColor('#AAB8AF').lineWidth(0.8).moveTo(dividerX, 24).lineTo(dividerX, 120).stroke();

    const invoiceX = dividerX + 20;
    doc.font('Helvetica-Bold').fontSize(27).fillColor(FOREST).text('INVOICE', invoiceX, 21, { lineBreak: false });
    const status = String(order.status || 'Order Placed');
    const badgeTextWidth = doc.font('Helvetica-Bold').fontSize(8.5).widthOfString(status);
    const badgeW = Math.min(148, badgeTextWidth + 32);
    roundedRect(doc, invoiceX, 57, badgeW, 21, 7, SAGE, null);
    doc.circle(invoiceX + 10, 67.5, 5).fill(PRIMARY);
    doc.strokeColor(WHITE).lineWidth(0.9).moveTo(invoiceX + 7.5, 67.5).lineTo(invoiceX + 9.5, 69.5).lineTo(invoiceX + 13, 65.5).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PRIMARY).text(status, invoiceX + 19, 63, { width: badgeW - 24, lineBreak: false });

    const invoiceDateText = invoiceDate.toLocaleDateString('en-IN');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MAIN).text('Invoice No', invoiceX, 87, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MAIN).text(String(invoiceNumber), invoiceX + 66, 87, { width: 143, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MAIN).text('Invoice Date', invoiceX, 105, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MAIN).text(invoiceDateText, invoiceX + 66, 105, { width: 143, lineBreak: false });

    if (fs.existsSync(BASKET_PATH)) {
      try {
        doc.save();
        doc.roundedRect(439, 17, 136, 108, 8).clip();
        doc.image(BASKET_PATH, 439, 17, { fit: [136, 108], align: 'center', valign: 'center' });
        doc.restore();
      } catch (error) {
        doc.restore();
      }
    }
  }

  function drawBanner(y) {
    roundedRect(doc, M, y, CONTENT_W, 48, 8, SAGE, null);
    drawIcon(doc, M + 14, y + 12, 24, 'leaf');
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(FOREST).text('Good Food, Healthy Life', M + 47, y + 10);
    doc.font('Helvetica').fontSize(8.5).fillColor(SECONDARY).text('Pure products. Better choices. A healthier tomorrow.', M + 47, y + 27);
  }

  function drawInfoCards(y) {
    const gap = 12;
    const cardW = (CONTENT_W - gap) / 2;
    const leftX = M;
    const rightX = M + cardW + gap;
    const labelW = 90;
    const valueW = cardW - labelW - 32;
    const orderRows = [
      ['Invoice No', String(invoiceNumber)],
      ['Order ID', String(orderId)],
      ['Order Date', order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : invoiceDate.toLocaleDateString('en-IN')],
      ['Order Status', String(order.status || 'Order Placed')],
      ['Payment Method', String(paymentMethod)],
    ];
    const rowHeights = orderRows.map(([label, value]) => Math.max(
      15,
      getTextHeight(doc, label, labelW, 8.2) + 1,
      getTextHeight(doc, value, valueW, 8.2) + 1
    ));
    const detailsHeight = Math.max(142, 36 + 13 + rowHeights.reduce((sum, height) => sum + height + 5, 0) + 10);

    const billLines = [
      { text: String(customerName), font: 'Helvetica-Bold', size: 10.5, gap: 5 },
      { text: String(addr.line1 || ''), font: 'Helvetica', size: 8.8, gap: 3 },
      { text: [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', '), font: 'Helvetica', size: 8.8, gap: 3 },
      { text: addr.phone ? `Phone: ${addr.phone}` : '', font: 'Helvetica', size: 8.8, gap: 0 },
      { text: order.user?.email ? `Email: ${order.user.email}` : '', font: 'Helvetica', size: 8.2, gap: 0 },
    ].filter((line) => line.text);
    const billHeight = billLines.reduce((sum, line) => sum + getTextHeight(doc, line.text, cardW - 30, line.size, line.font) + line.gap, 0);
    const cardH = Math.max(detailsHeight, 36 + 14 + billHeight + 10);

    [[leftX, 'Bill To', 'user'], [rightX, 'Order Details', 'file']].forEach(([x, title, icon]) => {
      roundedRect(doc, x, y, cardW, cardH, 8, LIGHT, BORDER);
      roundedRect(doc, x, y, cardW, 36, 8, SAGE, null);
      doc.rect(x, y + 27, cardW, 9).fill(SAGE);
      drawIcon(doc, x + 14, y + 8, 20, icon);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(FOREST).text(title, x + 44, y + 11);
    });

    let billY = y + 51;
    for (const line of billLines) {
      doc.font(line.font).fontSize(line.size).fillColor(MAIN).text(line.text, leftX + 17, billY, {
        width: cardW - 32,
        lineGap: 1,
      });
      billY += getTextHeight(doc, line.text, cardW - 32, line.size, line.font) + line.gap;
    }

    let rowY = y + 50;
    for (let index = 0; index < orderRows.length; index += 1) {
      const [label, value] = orderRows[index];
      const rowH = rowHeights[index];
      doc.font('Helvetica').fontSize(8.2).fillColor(SECONDARY).text(label, rightX + 14, rowY, {
        width: labelW,
        height: rowH,
        lineGap: 1,
      });
      doc.font('Helvetica').fontSize(8.2).fillColor(MAIN).text(value, rightX + 14 + labelW + 7, rowY, {
        width: valueW,
        height: rowH,
        lineGap: 1,
      });
      rowY += rowH + 5;
    }

    return y + cardH;
  }

  const columns = {
    product: CONTENT_W * 0.49,
    quantity: CONTENT_W * 0.105,
    unitPrice: CONTENT_W * 0.195,
    subtotal: CONTENT_W * 0.21,
  };
  const tableHeaderHeight = 32;

  function drawTableHeader(y, continued = false) {
    drawSectionHeader(doc, M, y, CONTENT_W, continued ? 'Product Details (continued)' : 'Product Details', 'package');
    y += 38;
    doc.rect(M, y, CONTENT_W, tableHeaderHeight).fill(SAGE);
    doc.strokeColor(BORDER).lineWidth(0.6).rect(M, y, CONTENT_W, tableHeaderHeight).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(FOREST);
    doc.text('Product', M + 14, y + 10, { lineBreak: false });
    doc.text('Qty', M + columns.product, y + 10, { width: columns.quantity, align: 'center', lineBreak: false });
    doc.text('Unit Price', M + columns.product + columns.quantity, y + 10, { width: columns.unitPrice - 8, align: 'right', lineBreak: false });
    doc.text('Subtotal', M + columns.product + columns.quantity + columns.unitPrice, y + 10, { width: columns.subtotal - 12, align: 'right', lineBreak: false });
    return y + tableHeaderHeight;
  }

  function drawProductRow(item, y, index, imagePath) {
    const name = String(item.name || item.product?.name || 'Product');
    const textX = M + 60;
    const textW = columns.product - 72;
    const rowH = 60;

    doc.rect(M, y, CONTENT_W, rowH).fill(index % 2 === 0 ? WHITE : LIGHT);
    doc.strokeColor(BORDER).lineWidth(0.55).rect(M, y, CONTENT_W, rowH).stroke();

    let imageDrawn = false;
    if (imagePath) {
      let imageStateSaved = false;
      try {
        roundedRect(doc, M + 10, y + (rowH - 40) / 2, 40, 40, 5, SAGE, BORDER);
        doc.save();
        imageStateSaved = true;
        doc.roundedRect(M + 10, y + (rowH - 40) / 2, 40, 40, 5).clip();
        doc.image(imagePath, M + 10, y + (rowH - 40) / 2, { fit: [40, 40], align: 'center', valign: 'center' });
        doc.restore();
        imageStateSaved = false;
        imageDrawn = true;
      } catch (error) {
        if (imageStateSaved) doc.restore();
        logImageFailure(order, item, index, { reason: error.code || 'pdfkit-render-failed' });
      }
    }
    if (!imageDrawn) drawProductImagePlaceholder(doc, M + 10, y + (rowH - 40) / 2);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(MAIN).text(name, textX, y + 8, {
      width: textW,
      height: rowH - 16,
      lineGap: 1,
      ellipsis: true,
    });
    doc.font('Helvetica').fontSize(9).fillColor(MAIN).text(String(item.quantity == null ? 0 : item.quantity), M + columns.product, y + (rowH - 11) / 2, {
      width: columns.quantity,
      align: 'center',
      lineBreak: false,
    });
    doc.font('Helvetica').fontSize(8.7).fillColor(MAIN).text(formatINR(item.price), M + columns.product + columns.quantity, y + (rowH - 11) / 2, {
      width: columns.unitPrice - 8,
      align: 'right',
      lineBreak: false,
    });
    const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    doc.font('Helvetica').fontSize(8.7).fillColor(MAIN).text(formatINR(itemSubtotal), M + columns.product + columns.quantity + columns.unitPrice, y + (rowH - 11) / 2, {
      width: columns.subtotal - 12,
      align: 'right',
      lineBreak: false,
    });

    const separators = [
      M + columns.product,
      M + columns.product + columns.quantity,
      M + columns.product + columns.quantity + columns.unitPrice,
    ];
    doc.strokeColor(BORDER).lineWidth(0.45);
    separators.forEach((x) => doc.moveTo(x, y).lineTo(x, y + rowH).stroke());
    return rowH;
  }

  function drawPaymentCards(y) {
    const gap = 16;
    const cardW = (CONTENT_W - gap) / 2;
    const paymentLines = [
      { label: 'Item Subtotal', amount: formatINR(subtotal) },
      { label: 'Delivery Charge', amount: formatINR(deliveryCharge) },
    ];
    if (discount > 0) paymentLines.push({ label: 'Discount', amount: `- ${formatINR(discount)}` });
    if (tax > 0) paymentLines.push({ label: 'Tax', amount: formatINR(tax) });

    const summaryH = Math.max(122, 36 + 10 + paymentLines.length * 20 + 35 + 10);
    const cardH = Math.max(122, summaryH);
    const leftX = M;
    const rightX = M + cardW + gap;

    roundedRect(doc, leftX, y, cardW, cardH, 8, LIGHT, BORDER);
    roundedRect(doc, leftX, y, cardW, 36, 8, SAGE, null);
    doc.rect(leftX, y + 27, cardW, 9).fill(SAGE);
    drawIcon(doc, leftX + 14, y + 8, 20, 'card');
    doc.font('Helvetica-Bold').fontSize(11).fillColor(FOREST).text('Payment Method', leftX + 44, y + 11);
    doc.font('Helvetica').fontSize(9).fillColor(MAIN).text(String(paymentMethod), leftX + 16, y + 52, {
      width: cardW - 32,
      lineGap: 1,
    });
    roundedRect(doc, rightX, y, cardW, cardH, 8, LIGHT, BORDER);
    roundedRect(doc, rightX, y, cardW, 36, 8, SAGE, null);
    doc.rect(rightX, y + 27, cardW, 9).fill(SAGE);
    drawIcon(doc, rightX + 14, y + 8, 20, 'receipt');
    doc.font('Helvetica-Bold').fontSize(11).fillColor(FOREST).text('Payment Summary', rightX + 44, y + 11);

    let amountY = y + 48;
    for (const line of paymentLines) {
      doc.font('Helvetica').fontSize(8.8).fillColor(SECONDARY).text(line.label, rightX + 16, amountY, {
        width: cardW * 0.58,
        lineBreak: false,
      });
      doc.font('Helvetica').fontSize(8.8).fillColor(MAIN).text(line.amount, rightX + cardW * 0.58, amountY, {
        width: cardW * 0.36 - 16,
        align: 'right',
        lineBreak: false,
      });
      amountY += 19;
    }
    doc.strokeColor(BORDER).lineWidth(0.6).moveTo(rightX + 14, amountY - 5).lineTo(rightX + cardW - 14, amountY - 5).stroke();
    const totalY = amountY + 3;
    roundedRect(doc, rightX + 9, totalY, cardW - 18, 30, 6, SAGE, null);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(FOREST).text('Total', rightX + 19, totalY + 8, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(FOREST).text(formatINR(grandTotal), rightX + 20, totalY + 6, {
      width: cardW - 38,
      align: 'right',
      lineBreak: false,
    });

    return y + cardH;
  }

  function drawFooter() {
    const waveY = FOOTER_Y;
    doc.save();
    doc.moveTo(0, waveY);
    doc.bezierCurveTo(PAGE_W * 0.28, waveY + 21, PAGE_W * 0.72, waveY + 21, PAGE_W, waveY);
    doc.lineTo(PAGE_W, PAGE_H);
    doc.lineTo(0, PAGE_H);
    doc.closePath().fill(FOREST);
    doc.restore();

    if (fs.existsSync(LOGO_PATH)) {
      roundedRect(doc, 22, waveY + 38, 150, 78, 8, WHITE, null);
      doc.image(LOGO_PATH, 44, waveY + 40, { fit: [106, 74], align: 'center', valign: 'center' });
    } else {
      doc.font('Helvetica-Bold').fontSize(15).fillColor(WHITE).text('GreenMart', 25, waveY + 47);
    }
    doc.strokeColor('#397253').lineWidth(0.7).moveTo(184, waveY + 38).lineTo(184, waveY + 112).stroke();

    doc.font('Helvetica').fontSize(9.3).fillColor('#DDEBE1').text('Thank you for shopping with', 202, waveY + 45, { width: 177 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(WHITE).text('GreenMart!', 202, waveY + 62, { width: 177 });
    doc.font('Helvetica').fontSize(7.2).fillColor('#C9E6D6').text('This is a computer-generated invoice.', 202, waveY + 88, { width: 177 });
    doc.strokeColor('#397253').lineWidth(0.7).moveTo(389, waveY + 38).lineTo(389, waveY + 112).stroke();

    const featureW = 55;
    const featureGap = 9;
    const featureStartX = 402;
    const features = [
      ['organic', '100% Organic', 'Products'],
      ['truck', 'Support Local', 'Farmers'],
      ['secure', 'Safe & Secure', 'Shopping'],
    ];
    features.forEach(([icon, first, second], index) => {
      const x = featureStartX + index * (featureW + featureGap);
      doc.circle(x + featureW / 2, waveY + 55, 14).fill(SAGE);
      drawIcon(doc, x + featureW / 2 - 9, waveY + 46, 18, icon);
      doc.font('Helvetica').fontSize(6.7).fillColor('#E6F0E9').text(first, x, waveY + 77, { width: featureW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(6.7).fillColor('#E6F0E9').text(second, x, waveY + 87, { width: featureW, align: 'center', lineBreak: false });
    });
  }

  drawHeader();
  drawBanner(137);
  let y = drawInfoCards(198) + 16;
  y = drawTableHeader(y);

  items.forEach((item, index) => {
    const imagePath = productImages[index];
    const rowHeight = 60;
    if (y + rowHeight > FOOTER_Y - 10) {
      doc.addPage({ margin: 0, size: 'A4' });
      y = drawTableHeader(M + 4, true);
    }
    y += drawProductRow(item, y, index, imagePath);
  });

  const paymentY = y + 17;
  const estimatedPaymentHeight = Math.max(
    122,
    36 + 10 + (2 + (discount > 0 ? 1 : 0) + (tax > 0 ? 1 : 0)) * 20 + 35 + 10
  );
  if (paymentY + estimatedPaymentHeight > FOOTER_Y - 8) {
    doc.addPage({ margin: 0, size: 'A4' });
    y = M + 8;
  } else {
    y = paymentY;
  }
  drawPaymentCards(y);
  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    drawFooter();
  }

  return { doc, invoiceNumber };
}

module.exports = { generateInvoicePDF, getInvoiceNumber };
