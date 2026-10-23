import { fieldLabel } from "./labels";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function setupFormValidation(form: HTMLFormElement) {
  form.noValidate = true;
  // Cloudflare and browser types disagree on HTMLSelectElement.remove().
  const fields = Array.from(
    form.querySelectorAll("input, textarea, select"),
  ) as unknown as Field[];
  const errorFor = (field: Field) => {
    const id = `${field.id || field.name}-error`;
    let error = form.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!error) {
      error = document.createElement("span");
      error.id = id;
      error.className = "field-error";
      error.setAttribute("role", "alert");
      field.insertAdjacentElement("afterend", error);
    }
    return error;
  };
  const clear = (field: Field) => {
    field.removeAttribute("aria-invalid");
    form
      .querySelector<HTMLElement>(
        `#${CSS.escape(`${field.id || field.name}-error`)}`,
      )
      ?.replaceChildren();
  };
  form.addEventListener("reset", () => fields.forEach(clear));
  return {
    validate(): boolean {
      let firstInvalid: Field | undefined;
      for (const field of fields) {
        clear(field);
        let message = "";
        if (field.required) {
          if (
            field instanceof HTMLInputElement &&
            field.type === "checkbox" &&
            !field.checked
          )
            message = "Centang kotak ini.";
          else if (
            field instanceof HTMLInputElement &&
            field.type === "file" &&
            !field.files?.length
          )
            message = "Pilih berkas.";
          else if (field.value.trim() === "")
            message = `${fieldLabel(field.name)} wajib diisi.`;
        }
        if (
          !message &&
          field.name === "startYear" &&
          field.value.trim() !== ""
        ) {
          const year = Number(field.value);
          if (!Number.isInteger(year) || year < 1900 || year > 2200)
            message = "Masukkan tahun mulai antara 1900 dan 2200.";
        }
        if (!message && field.name === "endYear" && field.value.trim() !== "") {
          const year = Number(field.value);
          if (!Number.isInteger(year) || year < 1900 || year > 2200)
            message =
              "Masukkan tahun selesai antara 1900 dan 2200, atau kosongkan kolom.";
        }
        if (!message && !field.validity.valid) {
          if (
            field.validity.typeMismatch &&
            field instanceof HTMLInputElement &&
            field.type === "email"
          )
            message = "Masukkan alamat email yang valid.";
          else if (
            field.validity.typeMismatch &&
            field instanceof HTMLInputElement &&
            field.type === "url"
          )
            message = "Masukkan URL yang valid.";
          else if (
            field.validity.badInput ||
            field.validity.rangeUnderflow ||
            field.validity.rangeOverflow ||
            field.validity.stepMismatch
          )
            message = "Masukkan angka yang valid.";
          else message = "Masukkan nilai yang valid.";
        }
        if (!message) continue;
        field.setAttribute("aria-invalid", "true");
        const error = errorFor(field);
        error.textContent = message;
        field.setAttribute(
          "aria-describedby",
          `${field.getAttribute("aria-describedby") || ""} ${error.id}`.trim(),
        );
        firstInvalid ||= field;
      }
      firstInvalid?.focus();
      return !firstInvalid;
    },
  };
}
