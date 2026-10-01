import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useStore } from "../store/Store";
import { send, message } from "../services/api";
import { Field } from "../components/UI";
import { SEO } from "../components/SEO";
export function Auth({
  mode,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
}) {
  const { signIn } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const register = mode === "register",
    reset = mode === "reset-password",
    forgot = mode === "forgot-password";
  const schema = z
    .object({
      name: register
        ? z.string().trim().min(2, "Enter your name")
        : z.string().optional(),
      email: reset ? z.string().optional() : z.email("Enter a valid email"),
      mobile: register
        ? z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number")
        : z.string().optional(),
      password: forgot
        ? z.string().optional()
        : z
            .string()
            .min(
              register || reset ? 10 : 1,
              register || reset
                ? "Use at least 10 characters"
                : "Enter your password",
            ),
      confirm: register || reset ? z.string().min(1) : z.string().optional(),
      remember: z.boolean().optional(),
    })
    .refine((v) => !(register || reset) || v.password === v.confirm, {
      path: ["confirm"],
      message: "Passwords do not match",
    });
  type Form = z.infer<typeof schema>;
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      password: "",
      confirm: "",
      remember: false,
    },
  });
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;
  const title = register
    ? "Make yourself at home."
    : forgot
      ? "Let’s get you back in."
      : reset
        ? "A fresh start."
        : "Welcome back.";
  async function submit(data: Form) {
    try {
      if (forgot) {
        const r = await send("/auth/forgot-password", { email: data.email });
        toast.success(r.message);
        return;
      }
      if (reset) {
        const r = await send("/auth/reset-password", {
          token: params.get("token") || "",
          password: data.password,
        });
        toast.success(r.message);
        navigate("/login");
        return;
      }
      await signIn(mode, data);
      toast.success(
        register ? "Your account is ready." : "Good to see you again.",
      );
      const target = params.get("next");
      navigate(
        target?.startsWith("/") && !target.startsWith("//")
          ? target
          : "/account",
      );
    } catch (e) {
      setError("root", { message: message(e) });
    }
  }
  return (
    <div className="auth-page container">
      <SEO title={mode.replace("-", " ")} />
      <div className="auth-story">
        <span className="eyebrow">GOOD THINGS START HERE.</span>
        <h2>
          Little upgrades.
          <br />
          <em>A better everyday.</em>
        </h2>
        <p>Your favourite finds, all in one place.</p>
        <img
          src="/catalog/photo-1514228742587-6b1558fcca3d.jpg"
          alt="A ceramic cup for a quiet morning"
        />
      </div>
      <section className="auth-form">
        <span className="eyebrow">
          {register
            ? "JOIN THE NEST"
            : forgot || reset
              ? "PASSWORD RECOVERY"
              : "YOUR NEST ACCOUNT"}
        </span>
        <h1>{title}</h1>
        <p>
          {register
            ? "Create an account for easier shopping and order tracking."
            : forgot
              ? "Enter your email and we’ll send you a password reset link."
              : reset
                ? "Choose a secure password with at least 10 characters."
                : "Sign in to find your favourites and follow your orders."}
        </p>
        <form onSubmit={handleSubmit(submit)} noValidate>
          {register && (
            <Field label="Full name" error={errors.name?.message}>
              <input autoComplete="name" {...field("name")} />
            </Field>
          )}
          {!reset && (
            <Field label="Email address" error={errors.email?.message}>
              <input type="email" autoComplete="email" {...field("email")} />
            </Field>
          )}
          {register && (
            <Field label="Mobile number" error={errors.mobile?.message}>
              <div className="phone-field">
                <span>+91</span>
                <input
                  type="tel"
                  autoComplete="tel-national"
                  maxLength={10}
                  {...field("mobile")}
                />
              </div>
            </Field>
          )}
          {!forgot && (
            <Field
              label={reset ? "New password" : "Password"}
              error={errors.password?.message}
            >
              <input
                type="password"
                autoComplete={
                  register || reset ? "new-password" : "current-password"
                }
                {...field("password")}
              />
            </Field>
          )}
          {(register || reset) && (
            <Field label="Confirm password" error={errors.confirm?.message}>
              <input
                type="password"
                autoComplete="new-password"
                {...field("confirm")}
              />
            </Field>
          )}
          {mode === "login" && (
            <div className="form-inline">
              <label>
                <input type="checkbox" {...field("remember")} />
                Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          {errors.root && (
            <p className="field-error" role="alert">
              {errors.root.message}
            </p>
          )}
          <button className="btn full" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait…"
              : register
                ? "Create account"
                : forgot
                  ? "Send reset link"
                  : reset
                    ? "Save new password"
                    : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              New around here?{" "}
              <Link
                to={
                  "/register" +
                  (params.get("next")
                    ? "?next=" + encodeURIComponent(params.get("next")!)
                    : "")
                }
              >
                Create an account
              </Link>
            </>
          ) : (
            <Link to="/login">Back to sign in</Link>
          )}
        </p>
      </section>
    </div>
  );
}
