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
import {
  Send,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Loader2,
  Clock3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const contactItems = [
  {
    icon: Phone,
    label: "Phone",
    value: contactInfo.phone,
    hint: "Prefer a quick call?",
    href: `tel:${contactInfo.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email",
    value: contactInfo.email,
    hint: "We reply within 24 hrs",
    href: `mailto:${contactInfo.email}`,
  },
  {
    icon: MapPin,
    label: "Address",
    value: contactInfo.address,
    hint: "Come say hi",
    href: null,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with us now",
    hint: "Fastest reply →",
    href: `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, "")}`,
    featured: true,
  },
];

export const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    honeypot: "",
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
        email: formData.email,
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        service: "",
        message: "",
        honeypot: "",
      });
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
    <section
      id="contact"
      className="py-24 lg:py-32 relative overflow-x-clip scroll-mt-24"
      style={{
        background:
          "linear-gradient(165deg, #fff 0%, #FFF7F3 45%, #F8FAFC 100%)",
      }}
    >
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-navy-dark pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/25 to-transparent" />
      <div className="absolute -top-24 right-10 w-72 h-72 bg-coral/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Shared header — keeps both columns aligned */}
        <div className="max-w-2xl mb-10 lg:mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Contact Us
            </span>
            <span className="font-hand text-xl text-coral rotate-[-2deg] select-none">
              star of the show ↓
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white leading-tight">
            Tell us what you need.{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral">We’ll reply.</span>
              <span
                className="absolute bottom-1 left-0 w-full h-3 bg-coral/15 rounded-sm -z-0"
                aria-hidden
              />
            </span>
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg max-w-xl">
            No fluff pitch. Send a note — or WhatsApp us — and we’ll come back
            with a clear plan, timeline, and budget.
          </p>
          <p className="font-hand text-xl text-coral mt-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            usually within one business day
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Form */}
          <div className="lg:col-span-7 min-w-0 flex">
            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col gap-5 w-full h-full rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/60 p-6 sm:p-8 shadow-sm"
              noValidate
            >
              <div
                className="absolute opacity-0 h-0 w-0 overflow-hidden"
                aria-hidden="true"
                tabIndex={-1}
              >
                <input
                  name="honeypot"
                  value={formData.honeypot}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="min-w-0">
                  <Input
                    name="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-label="Your name"
                    className={`h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${errors.name ? "border-red-400" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>
                <div className="min-w-0">
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
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
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
                  <SelectTrigger
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white"
                    aria-label="Select service"
                  >
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
                  placeholder="What are you trying to grow? (a line or two is enough)"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  aria-label="Your message"
                  className={`rounded-xl border-slate-200 dark:border-slate-600 focus:border-coral focus:ring-coral/20 bg-white dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 resize-none ${errors.message ? "border-red-400" : ""}`}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message}</p>
                )}
              </div>

              <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-coral hover:bg-coral-dark text-white font-bold px-10 py-6 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send my message
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <span className="font-hand text-lg text-coral/90">
                  no spam. just a real reply.
                </span>
              </div>
            </form>
          </div>

          {/* Contact actions — WhatsApp pinned to same bottom line as Send */}
          <div className="lg:col-span-5 min-w-0 flex flex-col gap-3 h-full">
            <aside className="rounded-2xl bg-[#FFF3C4] dark:bg-amber-200/90 text-navy px-5 py-3.5 shadow-md shrink-0">
              <p className="font-hand text-xl leading-snug">
                “Tell us the goal. We’ll bring the plan.”
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-hand text-base text-coral-dark">
                  — Bhufix team
                </span>
                <span className="font-hand text-base text-coral">
                  WhatsApp is fastest ↓
                </span>
              </div>
            </aside>

            <div className="flex flex-col gap-3">
              {contactItems
                .filter((item) => !item.featured)
                .map((item) => {
                  const Tag = item.href ? "a" : "div";
                  return (
                    <Tag
                      key={item.label}
                      href={item.href || undefined}
                      target={
                        item.href && item.href.startsWith("http")
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        item.href && item.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl border transition-colors duration-200 border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/55 hover:border-coral/40 hover:bg-coral/[0.06] ${
                        item.href ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-coral/10 text-coral transition-colors duration-200 group-hover:bg-coral group-hover:text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {item.label}
                        </div>
                        <div className="font-semibold text-sm sm:text-base mt-0.5 break-words text-navy dark:text-white">
                          {item.value}
                        </div>
                        <div className="font-hand text-[15px] leading-tight mt-0.5 text-coral">
                          {item.hint}
                        </div>
                      </div>
                    </Tag>
                  );
                })}
            </div>

            {contactItems
              .filter((item) => item.featured)
              .map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-auto flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500 hover:border-emerald-500 transition-colors duration-200 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/20 text-emerald-600 group-hover:bg-white group-hover:text-emerald-600 transition-colors duration-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80 group-hover:text-white/80">
                      {item.label}
                    </div>
                    <div className="font-semibold text-sm sm:text-base mt-0.5 break-words text-emerald-900 group-hover:text-white">
                      {item.value}
                    </div>
                    <div className="font-hand text-[15px] leading-tight mt-0.5 text-emerald-700 group-hover:text-white/90">
                      {item.hint}
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-emerald-600 group-hover:text-white shrink-0" />
                </a>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};
