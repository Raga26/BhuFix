import { useState } from "react";
import { contactInfo, services } from "../data/mock";
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
import { Send, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
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
    href: `https://wa.me/${contactInfo.whatsapp}`,
  },
];

export const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", service: "", message: "" });
      setSubmitting(false);
    }, 1500);
  };

  return (
    <section id="contact" className="py-24 lg:py-32 bg-slate-50/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Form */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Contact Us
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy mt-4 mb-6 leading-tight">
              Get in Touch with Our Team
            </h2>
            <p className="text-slate-500 text-lg mb-10">
              Ready to take your digital presence to the next level? Let us know
              how we can help.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Input
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl border-slate-200 focus:border-coral focus:ring-coral/20 bg-white"
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl border-slate-200 focus:border-coral focus:ring-coral/20 bg-white"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <Input
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-slate-200 focus:border-coral focus:ring-coral/20 bg-white"
                />
                <Select
                  value={formData.service}
                  onValueChange={(val) =>
                    setFormData({ ...formData, service: val })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-coral focus:ring-coral/20 bg-white">
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
              <Textarea
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="rounded-xl border-slate-200 focus:border-coral focus:ring-coral/20 bg-white resize-none"
              />
              <Button
                type="submit"
                disabled={submitting}
                className="bg-coral hover:bg-coral-dark text-white font-semibold px-10 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Message"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Right side */}
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 mb-10">
              <img
                src={CONTACT_IMAGE}
                alt="Contact Bhufix"
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
                    className="flex items-start gap-4 group p-4 rounded-xl hover:bg-coral/5 transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0 group-hover:bg-coral transition-all duration-300">
                      <item.icon className="h-5 w-5 text-coral group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {item.label}
                      </div>
                      <div className="text-navy font-semibold mt-1">
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
