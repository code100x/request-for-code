import { useRef } from "react";

interface InputOptions
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  /**
   * Input wrapper class name
   * @default ""
   * @type string
   */
  wrapperClassName?: string;

  /**
   * Input placeholder
   * @default ""
   * @type string
   */
  placeholder?: string;

  /**
   * Input label
   * @default ""
   * @type string
   */
  label?: string;

  /**
   * Input type
   * @default "text"
   * @type string
   */
  type?: "text" | "password" | "email" | "number" | "tel" | "url" | "file";

  /**
   * Input error state
   * @default false
   * @type boolean
   */
  error?: boolean;

  /**
   * Input error text
   * @default ""
   * @type string
   */
  errorText?: string;

  /**
   * Input required
   * @default false
   * @type boolean
   */
  required?: boolean;
}

const Input = (props: InputOptions) => {
  const {
    id,
    wrapperClassName = "",
    placeholder = "",
    label = "",
    type = "text",
    error = false,
    errorText = "",
    required = false,
    ...rest
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={wrapperClassName}>
      <label
        htmlFor={id}
        className="text-gray-800 text-sm placeholder-gray-800"
      >
        {label} {required && <span className="text-red">*</span>}
      </label>
      <div
        className={`border transition duration-150 ease-in-out rounded-lg mt-1 ${
          error
            ? "focus-within:border-red-600 border-red-600"
            : "focus-within:border-gray-700"
        }`}
        onClick={() => inputRef?.current?.focus()}
      >
        <input
          ref={inputRef}
          type={type}
          className="w-full px-2 h-10 text-gray-900 outline-none text-base rounded-md"
          id={id}
          placeholder={placeholder}
          {...rest}
        />
      </div>
      {errorText && <p className="text-xs pt-1 text-red-700">{errorText}</p>}
    </div>
  );
};

export default Input;
