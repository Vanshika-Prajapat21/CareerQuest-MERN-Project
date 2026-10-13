import { useState } from "react";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { categoryApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";

export default function ManageCategories() {
  const { data, reload, loading, error } = useFetch(() => categoryApi.list(), []);
  const [name, setName] = useState("");

  const add = async (ev) => {
    ev.preventDefault();
    if (!name.trim()) return toast.error("Enter a category name");
    try { await categoryApi.create({ name }); setName(""); toast.success("Category added"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await categoryApi.remove(c._id); toast.success("Deleted"); reload(); }
    catch (err) { toast.error(getError(err)); }
  };

  return (
    <>
      <h1>Manage Categories</h1>
      <form className="card filters" onSubmit={add}>
        <input className="filter-search" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <button className="btn btn-primary btn-sm">Add</button>
      </form>
      {loading && <Loader />}
      {error && <p className="error-box">{error}</p>}
      {data && (
        <div className="chips big-chips">
          {data.map((c) => (
            <span key={c._id} className="chip chip-type">{c.name} <button className="x" onClick={() => remove(c)} aria-label="Delete">×</button></span>
          ))}
        </div>
      )}
    </>
  );
}
