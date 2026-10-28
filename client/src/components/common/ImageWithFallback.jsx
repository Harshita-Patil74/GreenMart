import { getImageUrl } from "../../utils/imageUrl.js";
export default function ImageWithFallback({ src, alt, className, width, height }) {
  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }}
    />
  );
}
