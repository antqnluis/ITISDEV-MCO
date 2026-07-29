import AppIcon from "../ui/AppIcon";

const alertContent = {
  severe: {
    eyebrow: "Additional support recommended",
    title: "Consider connecting with someone soon",
    description: "This mock result shows severe stress. Reaching out early can help you make the next steps more manageable.",
    contacts: [
      "DLSU Counseling and Psychological Services",
      "An academic adviser or the Office of Student Affairs",
      "A trusted friend, family member, or mentor",
    ],
    role: "status",
    containerClass: "border-[#e7c98e] bg-[#fff8e9]",
    iconClass: "bg-[#f6e7c4] text-[#94621e]",
    eyebrowClass: "text-[#94621e]",
    titleClass: "text-[#694918]",
    bodyClass: "text-[#765b31]",
    buttonClass: "bg-[#8b641f] hover:bg-[#745218] focus-visible:outline-[#8b641f]",
  },
  critical: {
    eyebrow: "Immediate support recommended",
    title: "Please connect with support now",
    description: "This mock result shows a critical level of concern. Contact DLSU Counseling and Psychological Services or someone you trust immediately. If you believe you are in immediate danger, contact local emergency services.",
    contacts: [
      "DLSU Counseling and Psychological Services",
      "A trusted person who can stay with you",
      "Local emergency services when there is immediate danger",
    ],
    role: "alert",
    containerClass: "border-[#e2aaa5] bg-[#fff2f0]",
    iconClass: "bg-[#f7d9d6] text-[#a4463e]",
    eyebrowClass: "text-[#a4463e]",
    titleClass: "text-[#733832]",
    bodyClass: "text-[#824a44]",
    buttonClass: "bg-[#a4463e] hover:bg-[#8e3933] focus-visible:outline-[#a4463e]",
  },
};

function WellnessSupportAlert({ severity }) {
  const content = alertContent[severity];
  if (!content) return null;

  return (
    <section
      role={content.role}
      aria-live={severity === "critical" ? "assertive" : "polite"}
      className={`rounded-[22px] border p-5 shadow-[0_6px_18px_rgba(66,35,25,0.05)] sm:p-6 ${content.containerClass}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${content.iconClass}`}>
          <AppIcon name="warning" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-[0.15em] ${content.eyebrowClass}`}>
            {content.eyebrow}
          </p>
          <h2 className={`mt-1 font-serif text-2xl font-semibold ${content.titleClass}`}>
            {content.title}
          </h2>
          <p className={`mt-3 max-w-4xl text-sm leading-6 ${content.bodyClass}`}>
            {content.description}
          </p>
          <ul className={`mt-4 grid gap-2 text-sm sm:grid-cols-3 ${content.bodyClass}`}>
            {content.contacts.map((contact) => (
              <li key={contact} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-current" />
                <span>{contact}</span>
              </li>
            ))}
          </ul>
          <a
            href="#support-resources"
            className={`mt-5 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${content.buttonClass}`}
          >
            Review support options
          </a>
        </div>
      </div>
    </section>
  );
}

export default WellnessSupportAlert;
