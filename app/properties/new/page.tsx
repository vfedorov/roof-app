import { EditPropertyForm } from "@/app/components/edit-property-form";

export default function NewPropertyPage() {
    return (
        <div className="form-control">
            <h1 className="form-title">Add New Property</h1>

            <EditPropertyForm />
        </div>
    );
}
