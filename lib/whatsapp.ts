import { formatDate } from "@/lib/format";

export function buildEnquiryMessage(params: {
  propertyTitle: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  addonNames: string[];
  name: string;
  enquiryId: string;
}): string {
  const { propertyTitle, checkIn, checkOut, guests, addonNames, name, enquiryId } = params;
  return [
    `Namaste! I'd like to book *${propertyTitle}*.`,
    `Check-in: ${formatDate(checkIn)}`,
    `Check-out: ${formatDate(checkOut)}`,
    `Guests: ${guests}`,
    `Add-ons: ${addonNames.length ? addonNames.join(", ") : "None"}`,
    `Name: ${name}`,
    `Enquiry ref: ${enquiryId.slice(0, 8)}`,
  ].join("\n");
}

export function whatsAppLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
