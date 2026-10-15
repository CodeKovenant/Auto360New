import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RevealPhoneProps {
  phone: string;
  buttonClassName?: string;
  linkClassName?: string;
  iconClassName?: string;
  label?: string;
  testId?: string;
}

export default function RevealPhone({
  phone,
  buttonClassName,
  linkClassName,
  iconClassName = "mr-2 h-4 w-4",
  label = "View phone number",
  testId,
}: RevealPhoneProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (isRevealed) {
    return (
      <a href={"tel:" + phone} className={linkClassName} data-testid={testId}>
        <Phone className={iconClassName} />
        {phone}
      </a>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={buttonClassName}
      onClick={() => setIsRevealed(true)}
      data-testid={testId}
    >
      <Phone className={iconClassName} />
      {label}
    </Button>
  );
}
