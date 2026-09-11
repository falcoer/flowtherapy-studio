import { websiteColorRoles } from "../domain/website-brand.js";

/** Preserve legacy dark* roles without introducing them into every identity. */
export function BrandPalette({ colors, onChange }: {
  colors: Record<string, string>;
  onChange: (role: string, value: string) => void;
}) {
  const roles = [...new Set(["background", "text", "accent", "contrast", ...Object.keys(colors)])];
  const legacy = roles.filter((role) => /^dark[A-Z]/.test(role));
  const groups = [
    { label: legacy.length ? "Thème clair" : "Palette active", roles: roles.filter((role) => !legacy.includes(role)), dark: false },
    { label: "Thème sombre", roles: legacy, dark: true },
  ];
  return groups.filter((group) => group.roles.length).map((group) => (
    <div className="branding-color-group" key={group.label}>
      <h3>{group.label}</h3>
      <div className="branding-swatches">
        {group.roles.map((role) => {
          const baseRole = group.dark ? role[4].toLowerCase() + role.slice(5) : role;
          const label = websiteColorRoles[baseRole] ?? role;
          return (
            <label key={role}>
              {label}
              <input type="color" aria-label={group.dark ? `${group.label} — ${label}` : label}
                value={colors[role] ?? "#000000"}
                onChange={(event) => onChange(role, event.target.value)} />
              <span>{colors[role] ?? "Non défini"}</span>
            </label>
          );
        })}
      </div>
    </div>
  ));
}
