import React, { useState } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";
import messageApi from "../../api/messageApi";
import toast from "react-hot-toast";
export default function MessageFarmerModal({ open, onClose, to, product }) {
  const [text, setText] = useState("");
  const send = async () => {
    try { await messageApi.send({ to, product, text }); toast.success("Message sent"); onClose(); }
    catch { toast.error("Failed"); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Message Farmer">
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border border-border rounded-btn p-2 h-24" placeholder="Your message..." />
      <div className="mt-3 flex justify-end"><Button onClick={send}>Send</Button></div>
    </Modal>
  );
}
