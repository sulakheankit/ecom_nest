import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, AlertCircle, Minus, Plus, X, Star } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
export function Empty({
  title,
  text,
  to = "/products",
  label = "Explore the shop",
}: {
  title: string;
  text: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <ShoppingBag size={40} />
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="btn" to={to}>
        {label}
      </Link>
    </div>
  );
}
export function ErrorState({
  text,
  retry,
}: {
  text: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle />
      <p>{text}</p>
      {retry && (
        <button className="btn secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Skeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" aria-label="Loading product">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function Quantity({
  value,
  max = 99,
  onChange,
  disabled = false,
}: {
  value: number;
  max?: number;
  onChange: (q: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Decrease quantity"
        disabled={value <= 1 || disabled}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        aria-label="Increase quantity"
        disabled={value >= max || disabled}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="rating">
      <Star size={14} fill="currentColor" />
      {Number(value) > 0 ? Number(value).toFixed(1) : "New"}
      {count !== undefined && count > 0 && <span>({count})</span>}
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={"modal " + (wide ? "wide" : "")}
          aria-describedby={undefined}
        >
          <div className="modal-head">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title = "Remove this item?",
  text = "You can add it again later.",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  text?: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="overlay" />
        <AlertDialog.Content className="modal confirm">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{text}</AlertDialog.Description>
          <div className="actions">
            <AlertDialog.Cancel className="btn secondary">
              Keep it
            </AlertDialog.Cancel>
            <AlertDialog.Action className="btn danger" onClick={onConfirm}>
              Confirm
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className={"badge " + String(children).toLowerCase()}>
      {String(children).replaceAll("_", " ")}
    </span>
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">
        <span>{label}</span>
        {children}
      </label>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
