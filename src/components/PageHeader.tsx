import banner from "@/assets/farm-banner.webp";

/** The banner at the top of a page: its title and what the page is for, over a photo of fields. */
export default function PageHeader({ title, text }: { title: string; text: string }) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border bg-card">
      <img src={banner} alt="" className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover sm:w-3/4 lg:w-2/3" />
      {/* Solid up to where the photo starts, then clearing towards its right edge. Phones keep more of it, as the text runs across the photo there. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-card from-20% via-card/85 via-55% to-card/40 sm:from-30% sm:to-card/0 lg:from-35% lg:via-card/70 lg:via-60%" />
      <div className="max-w-xl px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{text}</p>
      </div>
    </section>
  );
}
