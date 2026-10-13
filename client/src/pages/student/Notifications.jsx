import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import { notificationApi } from "../../services/services";
import { getError } from "../../services/api";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";

const ICONS = { new_opportunity: "✨", deadline: "⏰", application: "📋", system: "ℹ️" };

export default function Notifications() {
  const { data, setData, loading, error } = useFetch(() => notificationApi.list(), []);

  const markRead = async (n) => {
    if (n.isRead) return;
    try {
      await notificationApi.markRead(n._id);
      setData(data.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    } catch (err) { toast.error(getError(err)); }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setData(data.map((x) => ({ ...x, isRead: true })));
    } catch (err) { toast.error(getError(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <p className="error-box">{error}</p>;

  return (
    <>
      <div className="row-between">
        <h1>🔔 Notifications</h1>
        {data.some((n) => !n.isRead) && <button className="btn btn-outline btn-sm" onClick={markAll}>Mark all as read</button>}
      </div>
      {data.length === 0 ? (
        <EmptyState icon="🔔" title="You are all caught up" text="New matches and deadline reminders will show up here." />
      ) : (
        <div className="card list">
          {data.map((n) => (
            <div key={n._id} className={`list-row note ${n.isRead ? "" : "unread"}`} onClick={() => markRead(n)}>
              <span className="note-icon">{ICONS[n.type]}</span>
              <div><strong>{n.title}</strong><p className="muted">{n.message}</p></div>
              <small className="muted">{new Date(n.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
