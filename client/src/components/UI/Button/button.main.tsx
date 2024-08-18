import clsx from "clsx";
import { forwardRef } from "react";

interface ButtonOptions {
  /**
   * Button display variants
   * @default "solid"
   * @type ButtonVariant
   */
  variant?: ButtonVariant;
}

type Ref = HTMLButtonElement;

export type ButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> &
  ButtonOptions;

type ButtonVariant = "outline" | "solid" | "ghost";

const colorMap = {
  outline: "text-primary bg-primary/5 border border-primary/5",
  solid: "text-dark bg-primary",
  ghost: "text-gray-900 hover:bg-gray-100",
} as Record<ButtonVariant, string>;

const Button = forwardRef<Ref, ButtonProps>((props, ref) => {
  const { variant = "solid", className, children, ...rest } = props;

  const merged = clsx(
    "inline-flex items-center justify-center px-6 py-2 text-base font-medium transition-all duration-200 rounded-lg focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed",
    colorMap[variant],
    className
  );

  return (
    <button ref={ref} className={merged} {...rest}>
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
