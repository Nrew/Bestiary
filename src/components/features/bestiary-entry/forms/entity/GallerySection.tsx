import React from "react";
import { FormSection } from "@/components/forms/FormSection";
import { ImageUpload } from "@/components/forms/ImageUpload";
import type { Entity } from "@/types";

export const GallerySection: React.FC = () => {
  return (
    <FormSection title="Gallery" iconCategory="class" iconName="bard">
      <div className="col-span-full">
        <ImageUpload<Entity>
          name="images"
          label="Images"
          description="Upload illustrations, portraits, or reference images for this creature."
          maxImages={10}
        />
      </div>
    </FormSection>
  );
};
