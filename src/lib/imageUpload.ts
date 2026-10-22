const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function setupImageUpload(
  root: HTMLElement,
  initialKey: string | null = null,
) {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const dropzone = root.querySelector<HTMLElement>("[data-dropzone]")!;
  const empty = root.querySelector<HTMLElement>("[data-dropzone-empty]")!;
  const preview = root.querySelector<HTMLElement>("[data-dropzone-preview]")!;
  const image = root.querySelector<HTMLImageElement>("[data-preview-image]")!;
  const name = root.querySelector<HTMLElement>("[data-preview-name]")!;
  const size = root.querySelector<HTMLElement>("[data-preview-size]")!;
  const error = root.querySelector<HTMLElement>("[data-file-error]")!;
  const clear = root.querySelector<HTMLButtonElement>("[data-image-clear]")!;
  let existingKey = initialKey;
  let removed = false;

  const render = () => {
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (input.files?.[0] === file && reader.result)
          image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (existingKey) image.src = `/api/admin/media/${existingKey}`;
    else image.removeAttribute("src");
    name.textContent = file ? file.name : existingKey?.split("/").pop() || "";
    size.textContent = file
      ? formatSize(file.size)
      : existingKey
        ? "Gambar tersimpan"
        : "";
    const hasImage = Boolean(file || existingKey);
    empty.hidden = hasImage;
    preview.hidden = !hasImage;
    clear.hidden = !hasImage;
    dropzone.classList.toggle("has-file", hasImage);
  };

  const validate = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      error.textContent = "Gunakan gambar JPEG, PNG, atau WEBP.";
      return false;
    }
    if (file.size > MAX_BYTES) {
      error.textContent = "Ukuran gambar maksimal 5 MB.";
      return false;
    }
    error.textContent = "";
    return true;
  };

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file && !validate(file)) input.value = "";
    render();
  });
  for (const type of ["dragenter", "dragover"])
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  for (const type of ["dragleave", "dragend"])
    dropzone.addEventListener(type, () =>
      dropzone.classList.remove("is-dragging"),
    );
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
    const file = event.dataTransfer?.files?.[0];
    if (!file || !validate(file)) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    render();
  });
  clear.addEventListener("click", () => {
    input.value = "";
    if (existingKey) removed = true;
    existingKey = null;
    error.textContent = "";
    render();
  });
  render();

  return {
    reset(key: string | null = null) {
      input.value = "";
      existingKey = key;
      removed = false;
      error.textContent = "";
      render();
    },
    get key() {
      return existingKey;
    },
    get removed() {
      return removed;
    },
  };
}
