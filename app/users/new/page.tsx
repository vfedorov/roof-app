import {CreateUserForm} from "@/app/components/create-user-form";

export default function NewUserPage() {
  return (
    <div className="form-control">
      <h1 className="form-title">Add New User</h1>
      <CreateUserForm />
    </div>
  );
}