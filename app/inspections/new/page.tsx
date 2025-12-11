import {supabase} from "@/lib/supabase";
import {getUser} from "@/lib/auth";
import {createInspection} from "../actions";

export default async function NewInspectionPage() {
    const user = await getUser();

    const { data: properties } = await supabase
      .from("properties")
      .select("id, name")
      .order("name");

    let inspectors: { id: string; name: string }[] = [];
    if (user.role === "admin") {
        const res = await supabase.from("users").select("id, name").eq("role", "inspector");
        inspectors = res.data ?? [];
    }

    return (
      <div className="p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">New Inspection</h1>

          <form action={createInspection} className="space-y-4">

              <div>
                  <label className="block mb-1 font-medium">Property</label>
                  <select name="property_id" className="select" required>
                      <option value="">Select Property</option>
                      {properties?.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                      ))}
                  </select>
              </div>

              {user.role === "admin" ? (
                <div>
                    <label className="block mb-1 font-medium">Inspector</label>
                    <select name="inspector_id" className="select" required>
                        <option value="">Select Inspector</option>
                        {inspectors.map((i) => (
                          <option key={i.id} value={i.id}>
                              {i.name}
                          </option>
                        ))}
                    </select>
                </div>
              ) : (
                <input type="hidden" name="inspector_id" value={user.id} />
              )}

              {/* DATE */}
              <div>
                  <label className="block mb-1 font-medium">Inspection Date</label>
                  <input type="date" name="date" className="input" required />
              </div>

              {/* ROOF TYPE */}
              <div>
                  <label className="block mb-1 font-medium">Roof Type</label>
                  <input name="roof_type" placeholder="e.g. Asphalt Shingle" className="input" />
              </div>

              {/* NOTES */}
              <div>
                  <label className="block mb-1 font-medium">Summary Notes</label>
                  <textarea name="summary_notes" className="textarea" placeholder="Write inspection notes..." />
              </div>

              {/* SUBMIT */}
              <button className="btn w-full mt-4">Create Inspection</button>
          </form>
      </div>
    );
}
