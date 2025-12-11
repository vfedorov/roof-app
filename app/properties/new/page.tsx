import {createProperty} from "../actions";

export default function NewPropertyPage() {
    return (
        <div className="form-control">
            <h1 className="form-title">Add New Property</h1>

            <form action={createProperty} className="space-y-4">

                <input required name="name" placeholder="Name" className="border p-2 w-full" />
                <input name="address" placeholder="Address" className="border p-2 w-full" />
                <input name="city" placeholder="City" className="border p-2 w-full" />
                <input name="state" placeholder="State" className="border p-2 w-full" />
                <input name="zip" placeholder="ZIP" className="border p-2 w-full" />
                <textarea name="notes" placeholder="Notes" className="border p-2 w-full" />

                <button className="bg-black text-white px-4 py-2 rounded">Save</button>
            </form>
        </div>
    );
}
