function WellnessIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="absolute left-1/2 top-[52%] w-[330px] -translate-x-1/2 -translate-y-1/2 opacity-70"
      viewBox="0 0 330 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="78" cy="216" r="88" fill="#B9D9B6" fillOpacity="0.24" />
      <ellipse cx="222" cy="151" rx="76" ry="98" fill="#A5CBA6" fillOpacity="0.34" />
      <ellipse cx="111" cy="260" rx="42" ry="67" fill="#94C492" fillOpacity="0.42" transform="rotate(22 111 260)" />
      <circle cx="106" cy="63" r="8" fill="#C7E4C4" />
      <circle cx="65" cy="146" r="7" fill="#75AF78" />
      <circle cx="289" cy="238" r="10" fill="#C7E8C3" />
      <circle cx="25" cy="336" r="6" fill="#91C592" />
      <circle cx="228" cy="344" r="7" fill="#C7E8C3" />
      <path d="M108 354C108 248 143 198 151 175C159 151 153 113 89 127" stroke="#73AA79" strokeOpacity="0.68" strokeWidth="1.8" />
      <path d="M191 354C163 270 146 210 143 174C140 137 124 111 89 127" stroke="#73AA79" strokeOpacity="0.68" strokeWidth="1.8" />
      <path d="M141 173C118 161 110 136 114 113C118 91 139 79 156 85C176 91 181 116 172 139C166 155 155 167 141 173Z" fill="#79B57B" fillOpacity="0.65" />
      <path d="M143 172C145 137 143 111 137 92" stroke="#6EA675" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M149 179C173 161 188 145 208 128" stroke="#73AA79" strokeOpacity="0.68" strokeWidth="1.8" />
      <path d="M159 153C168 124 194 110 218 118C243 127 249 151 234 170C218 190 183 194 159 177C154 173 154 161 159 153Z" fill="#7BB679" fillOpacity="0.65" />
      <path d="M154 178C183 163 207 144 225 127" stroke="#6EA675" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M133 210C106 204 88 186 85 161C82 136 98 120 119 122C143 124 155 151 149 175C146 190 141 201 133 210Z" fill="#76AE76" fillOpacity="0.68" />
      <path d="M134 210C118 183 105 157 96 136" stroke="#6EA675" strokeOpacity="0.55" strokeWidth="1.5" />
      <ellipse cx="141" cy="182" rx="13" ry="12" fill="#6AAA70" fillOpacity="0.62" />
      <ellipse cx="165" cy="194" rx="14" ry="18" fill="#7CB67B" fillOpacity="0.59" transform="rotate(35 165 194)" />
      <path d="M124 254C104 247 91 233 92 214C93 194 109 179 126 185C144 192 147 217 140 235C136 245 131 251 124 254Z" fill="#70AB73" fillOpacity="0.62" />
      <path d="M124 253C126 229 125 206 119 188" stroke="#6EA675" strokeOpacity="0.45" strokeWidth="1.3" />
      <ellipse cx="223" cy="89" rx="7" ry="13" fill="#71AC76" fillOpacity="0.7" transform="rotate(43 223 89)" />
      <ellipse cx="210" cy="100" rx="6" ry="12" fill="#75B178" fillOpacity="0.7" transform="rotate(64 210 100)" />
      <ellipse cx="40" cy="276" rx="7" ry="13" fill="#77B477" fillOpacity="0.66" transform="rotate(-58 40 276)" />
      <ellipse cx="54" cy="282" rx="6" ry="12" fill="#77B477" fillOpacity="0.66" transform="rotate(-62 54 282)" />
      <circle cx="253" cy="128" r="4" fill="#78AD78" fillOpacity="0.62" />
    </svg>
  );
}

function AuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-[#fdfcf9] lg:grid lg:grid-cols-[minmax(420px,42%)_1fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#e6f2e4] lg:block">
        <div className="absolute left-8 top-9">
          <Logo />
        </div>
        <WellnessIllustration />
      </aside>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        {children}
      </section>
    </main>
  );
}

export default AuthLayout;
import Logo from "./Logo";
