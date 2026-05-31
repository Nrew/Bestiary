import { FormSection } from "@/components/forms/FormSection";
import { FormInput } from "@/components/forms/FormPrimitives";
import type { Entity } from "@/types";

export function TaxonomySection() {
  return (
    <FormSection title="Taxonomy" iconCategory="monster" iconName="beast">
      <FormInput<Entity> name="taxonomy.genus" label="Genus" placeholder="e.g., Annelida" />
      <FormInput<Entity> name="taxonomy.species" label="Species" placeholder="e.g., Metamorphus terram" />
      <FormInput<Entity> name="taxonomy.subspecies" label="Subspecies" placeholder="Optional" />
    </FormSection>
  );
}
