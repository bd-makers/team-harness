// Plain `{{key}}` substitution only — the `.hbs` templates are NOT Handlebars:
// no `{{#if}}`/`{{#each}}`/helpers/escaping. A dotted key is looked up flat
// (`vars['a.b']`, not `vars.a.b`); missing or null values render as ''.
export function render(template, vars) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}
