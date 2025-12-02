import NodeDashboard from "@/src-mco2/components/Dashboard";
import IsolationChangeBtn from "@/src-mco2/components/IsolationChangeBtn";
import { getIsolationLevel } from "@/src-mco2/lib/server_methods";

export default async function Page() {
  const isolation = await getIsolationLevel();
  const nodeName = process.env.NEXT_PUBLIC_CURRENT_NODE || "Unknown Node";
  const isolationLevel = await getIsolationLevel();

  return (
    <NodeDashboard
      nodeName={nodeName}
      currentIsolation={isolationLevel}
      headerAction={
        <IsolationChangeBtn
          currentLevel={isolation as "READ-UNCOMMITTED" | "READ-COMMITTED" | "REPEATABLE-READ" | "SERIALIZABLE"}
          className="border border-gray-600 border-dashed rounded-md p-2"
        />
      }
    />
  );
}