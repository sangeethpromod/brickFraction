"use client";
import { useState, type ComponentProps } from "react";
import { InputField } from "./InputField";

type Props = Omit<ComponentProps<typeof InputField>, "type" | "trailing">;

export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <InputField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="h-8 cursor-pointer rounded-sm px-2 text-[13px] font-medium text-grey transition-colors duration-200 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-bronze"
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
