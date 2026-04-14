import { useState } from "react";
import { contactInfo, services } from "../data/mock";
import logger from "../utils/logger";
import apiClient from "../utils/axiosConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Send, Phone, Mail, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CONTACT_IMAGE =
  "https://images.pexels.com/photos/3194521/pexels-photo-3194521.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const contactItems = [
  {
    icon: Phone,
    label: "Phone",
    value: contactInfo.phone,
    href: `tel:${contactInfo.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email",
    value: contactInfo.email,
    href: `mailto:${contactInfo.email}`,
  },
  {
    icon: MapPin,
    label: "Address",
    value: contactInfo.address,
    href: null,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with us",
    href: `https://wa.me/${contactInfo.whatsapp.replace(/\s+/g, '')}`,
  },
];

export const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    honeypot: "", // Spam trap - hidden field
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.message || formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      logger.warn("Form validation failed");
      return;
    }

    logger.info("Contact form submitted", { email: formData.email });
    setSubmitting(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        service: formData.service,
        message: formData.message.trim(),
        honeypot: formData.honeypot,
      };

      logger.formSubmit("ContactForm", submitData);

      const response = await apiClient.post("/contact", submitData);

      logger.success("Contact form submitted successfully", {
        id: response.data.id,
        email: formData.email
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", service: "", message: "", honeypot: "" });
      setErrors({});
    } catch (err) {
      logger.error("Contact form submission failed", {
        status: err.response?.status,
        message: err.message,
        email: formData.email,
      });

      if (err.response?.status === 429) {
        toast.error("Too many submissions. Please try again later.");
      } else if (err.response?.status === 422) {
        toast.error("Please check your form inputs and try again.");
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 lg:py-32 bg-slate-50/50 dark:bg-slate-900/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Form */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Contact Us
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-4 mb-6 leading-tight">
              Get in Touch with Our Team
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-10">
              Ready to take your digital presence to the next level? Let us know
              how we can help.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Honeypot - hidden from users, visible to bots */}
              <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                <input
                  name="honeypot"
                  value={formData.honeypot}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Input
                    name="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-label="Your name"
                    className={`h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${errors.name ? "border-red-400" : ""}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-label="Email address"
                    className={`h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${errors.email ? "border-red-400" : ""}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <Input
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  aria-label="Phone number"
                  className="h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
                <Select
                  value={formData.service}
                  onValueChange={(val) =>
                    setFormData({ ...formData, service: val })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white" aria-label="Select service">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.title}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Textarea
                  name="message"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  aria-label="Your message"
                  className={`rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 resize-none ${errors.message ? "border-red-400" : ""}`}
                />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-coral hover:bg-coral-dark text-white font-semibold px-10 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right side */}
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 mb-10">
              <img
                src={CONTACT_IMAGE}
                alt="Contact Bhufix team for digital marketing services"
                className="w-full h-[300px] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/20 to-transparent" />
            </div>

            <div className="space-y-4">
              {contactItems.map((item, i) => {
                const Tag = item.href ? "a" : "div";
                return (
                  <Tag
                    key={i}
                    href={item.href || undefined}
                    target={item.href && item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href && item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-4 group p-4 rounded-xl hover:bg-coral/5 dark:hover:bg-coral/10 transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0 group-hover:bg-coral transition-all duration-300">
                      <item.icon className="h-5 w-5 text-coral group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {item.label}
                      </div>
                      <div className="text-navy dark:text-white font-semibold mt-1">
                        {item.value}
                      </div>
                    </div>
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
