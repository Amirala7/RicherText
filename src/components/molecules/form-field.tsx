import { cloneElement, type ReactElement } from "react";

type FieldControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

// Form field molecule (ADR 0015): label above (optional link on its line),
// control, then help; an error takes the help's place. Gap s-2 throughout.
export function FormField({
  id,
  label,
  labelLink,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  labelLink?: React.ReactNode;
  help?: string;
  error?: string;
  children: ReactElement<FieldControlProps>;
}) {
  const note = error ?? help;
  const noteId = `${id}-note`;
  const labelEl = (
    <label htmlFor={id} className="text-sm font-medium">
      {label}
    </label>
  );
  return (
    <div className="grid w-full gap-2">
      {labelLink ? (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          {labelEl}
          {labelLink}
        </div>
      ) : (
        labelEl
      )}
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": note ? noteId : undefined,
      })}
      {note && (
        <span
          id={noteId}
          className={
            error
              ? "text-xs leading-[1.4] font-medium text-destructive"
              : "text-xs leading-[1.4] text-muted-foreground"
          }
        >
          {note}
        </span>
      )}
    </div>
  );
}
