const BhufixLogo = ({ size = 38, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 38 38"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="BhuFix logo mark"
  >
    {/* Rounded square background */}
    <rect width="38" height="38" rx="9" fill="#E8734A" />

    {/* Stylised "B" letterform */}
    <path
      d="M11 9h9.5c2.485 0 4.5 2.015 4.5 4.5S22.985 18 20.5 18H11V9z"
      fill="white"
    />
    <path
      d="M11 18h10c2.761 0 5 2.239 5 5s-2.239 5-5 5H11V18z"
      fill="white"
    />
    {/* Inner cutouts to give the B its shape */}
    <rect x="14" y="12" width="6" height="3" rx="1.5" fill="#E8734A" />
    <rect x="14" y="21" width="7" height="4" rx="2" fill="#E8734A" />

    {/* Small accent dot — digital "signal" feel */}
    <circle cx="30" cy="9" r="2.5" fill="white" opacity="0.85" />
  </svg>
);

export default BhufixLogo;
