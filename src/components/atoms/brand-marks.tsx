// Third-party marks for the landing page only (ADR 0023 colour exception):
// they keep their own colours. Simplified drawings until launch, when each
// brand's official asset replaces them (CONTEXT §12, "Before launch").
type MarkProps = React.ComponentProps<"svg">;

export function GoogleDocsMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
      />
      <path fill="#A1C2FA" d="M14 2v6h6z" />
      <rect x="7.5" y="11" width="9" height="1.5" rx=".5" fill="#fff" />
      <rect x="7.5" y="14" width="9" height="1.5" rx=".5" fill="#fff" />
      <rect x="7.5" y="17" width="6" height="1.5" rx=".5" fill="#fff" />
    </svg>
  );
}

export function WordMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#185ABD" />
      <path
        fill="#fff"
        d="M5.6 7.2h2l1.5 7 1.8-7h2.2l1.8 7 1.5-7h2l-2.5 9.6h-2l-1.9-6.9-1.9 6.9h-2z"
      />
    </svg>
  );
}

export function GmailMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M2 7.5V18a1.5 1.5 0 0 0 1.5 1.5H6V10z" />
      <path fill="#34A853" d="M18 10v9.5h2.5A1.5 1.5 0 0 0 22 18V7.5z" />
      <path
        fill="#EA4335"
        d="M6 10v9.5h0V10l6 4.5 6-4.5V5.8l-6 4.5-6-4.5L4.4 4.6A1.5 1.5 0 0 0 2 5.8v1.7z"
      />
      <path
        fill="#C5221F"
        d="M2 5.8v1.7L6 10V5.8L4.4 4.6A1.5 1.5 0 0 0 2 5.8z"
      />
      <path fill="#FBBC04" d="M18 5.8V10l4-2.5V5.8a1.5 1.5 0 0 0-2.4-1.2z" />
    </svg>
  );
}

export function OutlookMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="8" y="3" width="14" height="18" rx="2.5" fill="#28A8EA" />
      <rect x="2" y="6.5" width="12" height="11" rx="2" fill="#0078D4" />
      <ellipse
        cx="8"
        cy="12"
        rx="3"
        ry="3.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function GoogleMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
