import { Link } from "react-router-dom";
import { useStore } from "../store/Store";
import { SEO } from "../components/SEO";
export function Info({
  page,
}: {
  page: "about" | "contact" | "shipping" | "privacy";
}) {
  const { settings } = useStore();
  return (
    <div className="container page info-page">
      <SEO
        title={
          page === "about"
            ? "Our story"
            : page === "contact"
              ? "Here to help"
              : page === "shipping"
                ? "Shipping & returns"
                : "Privacy policy"
        }
      />
      <span className="eyebrow">
        {page === "about"
          ? "THOUGHTFULLY CHOSEN."
          : page === "contact"
            ? "A REAL CONVERSATION."
            : "THE LITTLE DETAILS."}
      </span>
      <h1>
        {page === "about"
          ? "Good things for your everyday."
          : page === "contact"
            ? "Let’s talk."
            : page === "shipping"
              ? "Delivered with care."
              : "Your privacy matters."}
      </h1>
      {page === "about" ? (
        <>
          <p className="lead">
            We believe the things you use every day should make your day a
            little better.
          </p>
          <img
            className="info-image"
            src="/catalog/photo-1555041469-a586c61ea9bc.jpg"
            alt="A comfortable, thoughtfully arranged living space"
          />
          <h2>Less searching. More living.</h2>
          <p>
            Nest brings together considered essentials for your home, your style
            and your daily routine. We look for useful design, dependable
            quality and those small details that feel good to live with.
          </p>
          <p>
            From the cup that starts your morning to the chair that ends your
            evening, there’s a little better waiting in the everyday.
          </p>
          <Link className="btn" to="/products">
            Find your good thing
          </Link>
        </>
      ) : page === "contact" ? (
        <>
          <p className="lead">
            A question about a find, your delivery or your order? We’re here to
            help.
          </p>
          <div className="contact-grid">
            <div>
              <h2>Email us</h2>
              <a href={"mailto:" + settings.email}>{settings.email}</a>
              <p>Include your order number so we can help faster.</p>
            </div>
            <div>
              <h2>Call us</h2>
              <a href={"tel:" + settings.phone.replaceAll(" ", "")}>
                {settings.phone}
              </a>
              <p>Monday–Saturday, 10 am–6 pm IST</p>
            </div>
            <div>
              <h2>Our home</h2>
              <p>{settings.address}</p>
            </div>
          </div>
          <p>
            Demo store contact details are examples. Update your store details
            in the admin settings before launch.
          </p>
        </>
      ) : page === "shipping" ? (
        <>
          <h2>Shipping</h2>
          <p>
            Standard delivery takes 4–6 business days and costs{" "}
            {settings.shipping_charge} rupees. Standard shipping is free for
            orders above {settings.free_shipping_threshold} rupees. Express
            delivery takes 1–3 business days and costs {settings.express_charge}{" "}
            rupees. We currently deliver within India.
          </p>
          <h2>Returns</h2>
          <p>
            Contact us within 7 days of delivery to request a return. Items must
            be unused, with original packaging and tags. Personal-care products
            must remain sealed. Our team will confirm eligibility and arrange
            the next steps.
          </p>
          <h2>Payment</h2>
          <p>
            Cash on Delivery is available. Online payments require a configured
            payment provider and are currently unavailable. GST is shown
            separately at checkout.
          </p>
          <h2>Need a hand?</h2>
          <Link className="text-link" to="/contact">
            Contact the store
          </Link>
        </>
      ) : (
        <>
          <p>
            We use the information you provide to manage your account, deliver
            orders and provide customer support. This includes your name, email,
            mobile number, delivery addresses and purchase history.
          </p>
          <h2>Your account</h2>
          <p>
            Your password is stored as a secure hash. A secure session cookie
            keeps you signed in. Guest shopping bags and recent searches are
            saved only in your browser.
          </p>
          <h2>Your choices</h2>
          <p>
            You can update your profile and addresses from your account. Contact
            the store to request account deletion or a copy of your information.
            Newsletter subscriptions are optional.
          </p>
          <p>
            This starter policy must be reviewed and adapted to your actual
            business, providers and data practices before launch.
          </p>
        </>
      )}
    </div>
  );
}
