import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../api/config";

const TimesheetForm = ({
  isBillable,
  setIsBillable,
  company,
  setCompany,
  project,
  setProject,
  workArea,
  setWorkArea,
  taskArea,
  setTaskArea,
  ticket,
  setTicket,
  handleAddToSheet,
  selectedWeek,
}) => {
  const [companyOptions, setCompanyOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState({ work: [], task: [] });

  const [nbReasons, setNbReasons] = useState([]);
  const [selectedNbReason, setSelectedNbReason] = useState(""); // uuid string
  const [nbIsClientTime, setNbIsClientTime] = useState(false);

  const token = localStorage.getItem("token");

  // 🔁 Fetch companies when billable toggle changes
  useEffect(() => {
    
    if (isBillable) {
      const fetchCompanies = async () => {
        try {
          const res = await axios.get(API.GET_COMPANIES_BY_BILLABLE(isBillable), {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log("Fetched companies:", res.data);

          setCompanyOptions(res.data);
          setCompany("");
          setProject("");
          setProjectOptions([]);
          setWorkArea("");
          setTaskArea("");
          setAreaOptions({ work: [], task: [] });

          setNbReasons([]);
          setSelectedNbReason("");
        } catch (err) {
          console.error("❌ Failed to fetch companies:", err);
        }
      };

      fetchCompanies();
    } else {
      const fetchNbReasons = async () => {
        try {
          const res = await axios.get(API.GET_NON_BILLABLE_REASONS, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log("Fetched NB reasons:", res.data);
          setNbReasons(res.data || []);
          setSelectedNbReason("");
        } catch (err) {
          console.error("❌ Failed to fetch non-billable reasons:", err);
        }
      };

      fetchNbReasons();
    }

    
  }, [isBillable]);

  // 🔁 Fetch projects when company changes
  useEffect(() => {
    if (!company) return;

    const fetchProjects = async () => {
      try {
        const res = await axios.get(API.GET_PROJECTS_BY_COMPANY(company), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjectOptions(res.data);
        setProject("");
        setWorkArea("");
        setTaskArea("");
        setAreaOptions({ work: [], task: [] });
      } catch (err) {
        console.error("❌ Failed to fetch projects:", err);
      }
    };

    fetchProjects();
  }, [company]);

  // 🔁 Fetch work areas when project changes
  useEffect(() => {
    if (!project) return;

    const fetchWorkAreas = async () => {
      try {
        const res = await axios.get(API.GET_AREAS_BY_PROJECT(project), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAreaOptions({ work: res.data.workAreas || [], task: [] });
        setWorkArea("");
        setTaskArea("");
      } catch (err) {
        console.error("❌ Failed to fetch work areas:", err);
      }
    };

    fetchWorkAreas();
  }, [project]);

  // 🔁 Fetch task areas when work area changes
  useEffect(() => {
    if (!project || !workArea) return;

    const fetchTaskAreas = async () => {
      try {
        const res = await axios.get(
          API.GET_TASK_AREAS_BY_PROJECT_AND_WORKAREA(project, workArea),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAreaOptions((prev) => ({
          ...prev,
          task: res.data.taskAreas || [],
        }));
        setTaskArea("");
      } catch (err) {
        console.error("❌ Failed to fetch task areas:", err);
      }
    };

    fetchTaskAreas();
  }, [workArea]);

  useEffect(() => {
    if (!selectedNbReason) {
      setNbIsClientTime(false);
      return;
    }

    const match = nbReasons.find(r => r.uuid === selectedNbReason);
    if (match && match.non_billable_reason.toLowerCase().includes("client time")) {
      setNbIsClientTime(true);
    } else {
      setNbIsClientTime(false);
    }
  }, [selectedNbReason, nbReasons]);

  const handleClick = () => {

    const selectedReasonObj = nbReasons.find(r => r.uuid === selectedNbReason);

    if (isBillable) {
      if (!company || !project) {
        alert("Please select Company and Project before adding.");
        return;
      }
    } else {
      if (!selectedNbReason) {
        alert("Please select a Non-Billable Reason.");
        return;
      }
      // If it's "Client Time (Non-Billable)", require company & project as well
      if (nbIsClientTime && (!company || !project)) {
        alert("For Client Time (Non-Billable), please select Company and Project.");
        return;
      }
    }

    const companyName =
      companyOptions.find((c) => c.company_id === company)?.company_name || "";
    const projectName =
      projectOptions.find((p) => p.sow_id === project)?.project_category || "";

    handleAddToSheet({
      billable: isBillable,
      company,
      companyName,
      project,
      projectName,
      workArea,
      taskArea,
      ticket,
      nonBillableReasonUuid: selectedReasonObj?.uuid || null,
      nonBillableReason: selectedReasonObj?.non_billable_reason || null,
    });
  };

  const isClientTimeNB = nbReasons.some(
    (r) => r.uuid === selectedNbReason && r.non_billable_reason === "Client Time (Non-Billable)"
  );

  return (
    <>
      <div className="mt-6 border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        {/* Billable/Non-Billable Toggle */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            className={`px-4 py-1 rounded-full text-sm ${
              isBillable ? "bg-purple-700 text-white" : "text-gray-600"
            }`}
            onClick={() => setIsBillable(true)}
          >
            Billable
          </button>
          <button
            className={`px-4 py-1 rounded-full text-sm ${
              !isBillable ? "bg-purple-700 text-white" : "text-gray-600"
            }`}
            onClick={() => setIsBillable(false)}
          >
            Non-Billable
          </button>
        </div>

        {/* Non-Billable Reason */}
        {!isBillable && (
          <div className="flex flex-col text-sm">
            <label className="mb-1 font-medium">*Reason</label>
            <select
              value={selectedNbReason}
              onChange={(e) => setSelectedNbReason(e.target.value)}
              className="border rounded px-3 py-2 min-w-[220px]"
            >
              <option value="">Select Reason</option>
              {nbReasons.map((r) => (
                <option key={r.uuid} value={r.uuid}>
                  {r.non_billable_reason}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Company Selector */}
        {selectedWeek && (isBillable || nbIsClientTime) && (
          <div className="flex flex-col text-sm">
            <label className="mb-1 font-medium">*Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="border rounded px-3 py-2 min-w-[180px]"
            >
              <option value="">Select Company</option>
              {companyOptions.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Project Selector */}
       {selectedWeek && (isBillable || nbIsClientTime) && (
          <div className="flex flex-col text-sm">
            <label className="mb-1 font-medium">*Project</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="border rounded px-3 py-2 min-w-[180px]"
            >
              <option value="">Select Project</option>
              {projectOptions.map((p) => (
                <option key={p.sow_id} value={p.sow_id}>
                  {p.project_category}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ticket Number */}
        {selectedWeek && (isBillable || nbIsClientTime) && (
        <div className="flex flex-col text-sm">
          <label className="mb-1 font-medium">Ticket No.</label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            className="border rounded px-3 py-2 min-w-[180px]"
            placeholder="Enter ticket number"
          />
        </div>
        )}

        {/* Add Button if No Work Areas */}
        {areaOptions.work.length === 0 && (
          <div className="flex items-end">
            <button
              onClick={handleClick}
              className="border border-purple-600 text-purple-700 px-4 py-2 rounded hover:bg-purple-50 text-sm"
            >
              + Add to Sheet
            </button>
          </div>
        )}
      </div>

      {/* Work Area & Task Area Row */}
      {areaOptions.work.length > 0 && (
        <div className="mt-3 border rounded-lg p-4 flex flex-wrap gap-4 items-end">
          {/* Work Area Selector */}
          <div className="flex flex-col text-sm">
            <label className="mb-1 font-medium">Work Area</label>
            <select
              value={workArea}
              onChange={(e) => setWorkArea(e.target.value)}
              className="border rounded px-3 py-2 min-w-[180px]"
            >
              <option value="">Select Work Area</option>
              {areaOptions.work.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Task Area Selector */}
          <div className="flex flex-col text-sm">
            <label className="mb-1 font-medium">Task Area</label>
            <select
              value={taskArea}
              onChange={(e) => setTaskArea(e.target.value)}
              disabled={!workArea || areaOptions.task.length === 0}
              className="border rounded px-3 py-2 pr-10 min-w-[180px]"
            >
              <option value="">
                {workArea
                  ? areaOptions.task.length > 0
                    ? "Select Task Area"
                    : "No task areas"
                  : "Select work area first"}
              </option>
              {areaOptions.task.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Add Button (Final Step) */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClick}
              className="border border-purple-600 text-purple-700 px-4 py-2 rounded hover:bg-purple-50 text-sm"
            >
              + Add to Sheet
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TimesheetForm;
