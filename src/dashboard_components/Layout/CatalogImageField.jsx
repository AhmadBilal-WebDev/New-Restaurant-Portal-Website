import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadCatalogImage, apiMessage } from '@/shared/lib/catalogApi';
const CatalogImageField = ({
  label,
  imageUrl,
  showUrlInput = true,
  onImageChange,
  uploadType,
  frontendDomainUrl,
  onError
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadCatalogImage(file, uploadType, frontendDomainUrl);
    setUploading(false);
    if (!result.ok || !result.imageUrl) {
      onError(apiMessage(result.data, "Image could not be uploaded."));
      return;
    }
    onImageChange(result.imageUrl);
  };
  return <div>
      <label className="block text-neutral-300 font-bold mb-1">{label}</label>
      <div className="flex flex-col items-start gap-2">
        {imageUrl ? <img
    src={imageUrl}
    alt="Preview"
    className="w-32 h-32 rounded-xl object-cover border border-[#292D35]"
  /> : <div className="w-32 h-32 rounded-xl bg-[#101216] border border-[#292D35] flex items-center justify-center">
            <Camera className="w-5 h-5 text-neutral-500" />
          </div>}

        <div className="space-y-2">
          {showUrlInput && <input
    type="text"
    value={imageUrl}
    onChange={(e) => onImageChange(e.target.value)}
    placeholder="https://... or upload an image"
    className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
  />}
          <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => handleFileSelect(e.target.files?.[0])}
  />
          <button
    type="button"
    disabled={uploading}
    onClick={() => fileInputRef.current?.click()}
    title="Upload photo"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252830] text-neutral-300 hover:text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
  >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            <span>{uploading ? "Uploading..." : "Upload Photo"}</span>
          </button>
        </div>
      </div>
    </div>;
};
export {
  CatalogImageField
};
