import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type Props = Omit<ComponentProps<typeof InputGroupInput>, "type"> & {
  /** Classes for the bordered box around the input and button (`className` goes on the input). */
  groupClassName?: string;
};

/** A password input with an eye button that shows or hides what was typed. */
export default function PasswordInput({ groupClassName, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={groupClassName}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
