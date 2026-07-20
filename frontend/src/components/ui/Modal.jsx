import { useEffect } from "react";
import AppIcon from "./AppIcon";

function Modal({ open, onClose, title, description, children, size = "max-w-2xl" }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#10251e]/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`my-6 w-full ${size} overflow-hidden rounded-[22px] border border-white/60 bg-[#fdfcf9] shadow-[0_24px_70px_rgba(16,37,30,0.24)]`}>
        <header className="flex items-start justify-between gap-6 border-b border-[#e4e9e5] px-6 py-5 sm:px-7">
          <div>
            <h2 id="modal-title" className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#10251e]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[#667972]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="grid size-10 shrink-0 place-items-center rounded-full text-[#63766f] transition hover:bg-[#eef3ef] hover:text-[#174635] focus-visible:outline-2 focus-visible:outline-[#4b8360]">
            <AppIcon name="close" />
          </button>
        </header>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-6 sm:p-7">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
