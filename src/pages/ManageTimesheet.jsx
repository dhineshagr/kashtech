import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TimesheetHeader from "../components/TimesheetHeader";
import TimesheetForm from "../components/TimesheetForm";
import TimesheetTable from "../components/TimesheetTable";
import API from "../api/config";
import { format } from "date-fns";

const ManageTimesheet = () => {
  const token = localStorage.getItem("token");
  const userInfo = JSON.parse(atob(token.split(".")[1]));
  const empIdFromToken = userInfo.emp_id;
  const userRole = userInfo.role;
  const navigate = useNavigate();

  const [employee, setEmployee] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showTimesheetFields, setShowTimesheetFields] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isBillable, setIsBillable] = useState(true);
  const [company, setCompany] = useState("");
  const [project, setProject] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [taskArea, setTaskArea] = useState("");
  const [ticket, setTicket] = useState("");

  const [entries, setEntries] = useState([]);
  const [originalEntries, setOriginalEntries] = useState([]);
  const deletedEntriesRef = useRef([]);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(API.GET_ALL_EMPLOYEES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEmployeeOptions(data);
        if (userRole === "Basic" || userRole === "Basic User") {
          const self = data.find((e) => e.emp_id === empIdFromToken);
          if (self) setEmployee(self.emp_id);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const storedEmpId = localStorage.getItem("edit_emp_id");
    const storedWeek = localStorage.getItem("edit_week_start");
    if (storedEmpId && storedWeek) {
      setEmployee(parseInt(storedEmpId));
      setWeekStartDate(new Date(storedWeek));
      setShowTimesheetFields(true);
      setIsEditMode(true);
      localStorage.removeItem("edit_emp_id");
      localStorage.removeItem("edit_week_start");
    }
  }, []);

  useEffect(() => {
    const fetchSavedEntries = async () => {
      if (!weekStartDate || !employee) return;

      const formattedDate = format(new Date(weekStartDate), "yyyy-MM-dd");
      console.log("[FETCH] Timesheet for:", {
        emp_id: employee,
        weekStartDate,
        formattedDate,
      });

      // helper: normalize billable (boolean or "true"/"false" -> boolean)
      const normalizeBool = (v) =>
        typeof v === "boolean" ? v : String(v ?? "").toLowerCase() === "true";

      try {
        const res = await fetch(API.GET_TIMESHEET_BY_WEEK(employee, formattedDate), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          const html = await res.text();
          console.warn("⚠️ Received HTML instead of JSON. Possible session timeout or server error.");
          console.log(html);
          alert("Session expired or server error. Please re-login.");
          return;
        }

        const data = await res.json();
        console.log("📥 Loaded timesheet data:", data);

        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((e) => {
            // treat empty string sow_id as null for NB rows
            const sowId = e.sow_id === "" ? null : e.sow_id ?? null;

            return {
              timesheet_entry_id: e.timesheet_entry_id,
              emp_id: e.emp_id,
              sow_id: sowId,
              company_id: e.company_id ?? null,

              // Names for display (may be null for NB non-client-time)
              companyName: e.company_name || "",
              projectName: e.project_category || "",

              ticket: e.ticket_num || "-",
              workArea: e.sub_assignment || "-",
              taskArea: e.sub_assignment_segment_1 || "-",
              notes: e.sub_assignment_segment_2 || "",

              // hours often come back as strings like "0.00"
              hours: [
                parseFloat(e.monday_hours || 0),
                parseFloat(e.tuesday_hours || 0),
                parseFloat(e.wednesday_hours || 0),
                parseFloat(e.thursday_hours || 0),
                parseFloat(e.friday_hours || 0),
                parseFloat(e.saturday_hours || 0),
                parseFloat(e.sunday_hours || 0),
              ],

              // new fields normalized for UI
              billable: normalizeBool(e.billable),
              nonBillableReason: e.non_billable_reason ?? null,
              nonBillableReasonUuid: e.non_billable_reason_uuid ?? null,

              timesheet_status_entry: e.timesheet_status_entry || "Submitted",
              period_start_date: formattedDate,
            };
          });

          // prime dependent UI bits from the first row if present
          const firstEntry = data[0];

          // only set company/project if they exist (NB non-client-time will be null)
          if (firstEntry?.company_id) setCompany(firstEntry.company_id);
          if (firstEntry?.sow_id) setProject(firstEntry.sow_id || null);

          const sorted = [...formatted].sort((a, b) => {
            const aId = Number(a.timesheet_entry_id) || -1;
            const bId = Number(b.timesheet_entry_id) || -1;
            return bId - aId;
          });

          setEntries(sorted);
          setOriginalEntries(sorted);
          
        } else {
          console.warn("⚠️ No data returned for timesheet.");
          setEntries([]);
          setOriginalEntries([]);
        }
      } catch (err) {
        console.error("❌ Error fetching timesheet:", err);
        alert("Failed to fetch timesheet. Please check console for details.");
      }
    };

    fetchSavedEntries();
  }, [weekStartDate, employee]);

  const handleAddToSheet = ({ billable, company, companyName, project, projectName, workArea, taskArea, ticket, nonBillableReasonUuid, nonBillableReason }) => { // Add the reason here as well
  
    const newEntry = {
      billable, // Can be true, false, or null
      emp_id: employee,
      sow_id: project,
      company_id: company,
      companyName,
      projectName,
      ticket: ticket || "-",
      workArea: workArea || "-",
      taskArea: taskArea || "-",
      notes: "",
      hours: [0, 0, 0, 0, 0, 0, 0],
      period_start_date: format(new Date(weekStartDate), "yyyy-MM-dd"),
      nonBillableReasonUuid: nonBillableReasonUuid || null,
      nonBillableReason: nonBillableReason || null,
    };

   setEntries((prev) => [newEntry, ...prev]);
  };

  const toVarcharBool = (v) => {
    if (v === true) return "true";
    if (v === false) return "false";
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (s === "true" || s === "false") return s;
    }
    return null; // fallback if unset
  };

  const handleSave = async () => {
    if (!weekStartDate) return alert("Please select a week.");
    setIsSaving(true);
    const formattedDate = format(new Date(weekStartDate), "yyyy-MM-dd");

    try {
      const newEntries = [];
      const updateEntries = [];

      for (const e of entries) { // Is derived from setEntries
        const hours = e.hours.map((h) => parseFloat(h) || 0);
        
        const payload = {
          emp_id: e.emp_id,
          sow_id: e.sow_id, // we just leave this null if its a non-client non-billable item
          period_start_date: formattedDate,
         
          ticket_num: e.ticket || "",
          monday_hours: hours[0],
          tuesday_hours: hours[1],
          wednesday_hours: hours[2],
          thursday_hours: hours[3],
          friday_hours: hours[4],
          saturday_hours: hours[5],
          sunday_hours: hours[6],
          sub_assignment: e.workArea,
          sub_assignment_segment_1: e.taskArea,
          sub_assignment_segment_2: e.notes,
          timesheet_status_entry: "Submitted",

          billable: toVarcharBool(e.billable),
          non_billable_reason: e.nonBillableReason || null, // Not insert this as well, set as NULL
          non_billable_reason_uuid: e.nonBillableReasonUuid || null,
        };

        /*
        const matchInOriginal = originalEntries.find( // Issue probably stems from here
          (orig) =>
            orig.emp_id === e.emp_id &&
            orig.sow_id === e.sow_id &&
            orig.period_start_date === formattedDate
        );

        if (matchInOriginal) updateEntries.push(payload);
        else newEntries.push(payload);
        */

        if (e.timesheet_entry_id) { // New check that is combo-agnostic
          updateEntries.push({ ...payload, timesheet_entry_id: e.timesheet_entry_id });
        } else {
          newEntries.push(payload);
        }
        
      }

      console.log("🗑️ Entries to delete:", deletedEntriesRef.current);

      if (deletedEntriesRef.current.length > 0) {
        await Promise.all(
          deletedEntriesRef.current.map((e) =>
            fetch(API.DELETE_TIMESHEET_ENTRY_BY_ID(e.timesheet_entry_id), {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }).then((res) => {
              if (!res.ok) {
                console.error("❌ Failed to delete entry:", e);
              } else {
                console.log("✅ Deleted:", e);
              }
            })
          )
        );
        deletedEntriesRef.current.length = 0;
      }

      if (newEntries.length > 0) {
        await fetch(API.TIMESHEET_ADD_BATCH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entries: newEntries }),
        });
      }

      if (updateEntries.length > 0) {
        await fetch(API.UPDATE_TIMESHEET_BATCH, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entries: updateEntries }),
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isEditMode) navigate("/timesheet-weekly-hours-report");
      }, 2000);
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("❌ Failed to save timesheet.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEntry = async (rowIdx) => {
    const removed = entries[rowIdx];
    console.log("🧹 Trying to remove:", removed);

    // Make sure we have the entryId first
    if (!removed?.timesheet_entry_id) {
      console.log("⛔ Skipped delete: Missing timesheet_entry_id.");
      return;
    }

    try {
      const res = await fetch(
        API.DELETE_TIMESHEET_ENTRY_BY_ID(removed.timesheet_entry_id),
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        console.error("❌ Failed to delete:", msg);
        return;
      }

      console.log(`🗑️ Deleted entryId=${removed.timesheet_entry_id}`);

      // Update state only if delete succeeds
      setEntries((prev) => prev.filter((_, i) => i !== rowIdx));

      // Track deleted entries locally if needed
      deletedEntriesRef.current.push({
        timesheet_entry_id: removed.timesheet_entry_id,
      });
      console.log("🚨 Deleting from ManageTimesheet:", deletedEntriesRef.current);
    } catch (err) {
      console.error("❌ Delete request failed:", err);
    }
  };

  const handleHourChange = (rowIdx, dayIdx, value) => {
    const updated = [...entries];
    updated[rowIdx].hours[dayIdx] = parseFloat(value) || 0;
    setEntries(updated);
  };

  const handleNoteChange = (rowIdx, value) => {
    const updated = [...entries];
    updated[rowIdx].notes = value;
    setEntries(updated);
  };

  return (
    <div className="min-h-screen p-6 text-gray-800 dark:text-white">
      <h2 className="text-4xl font-bold mb-6 text-purple-900 dark:text-white">
        Manage Timesheet
      </h2>

      <TimesheetHeader
        userRole={userRole}
        employee={employee}
        setEmployee={setEmployee}
        employeeOptions={employeeOptions}
        weekStartDate={weekStartDate}
        setWeekStartDate={setWeekStartDate}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        showTimesheetFields={showTimesheetFields}
        setShowTimesheetFields={setShowTimesheetFields}
      />

      {showTimesheetFields && (
        <>
          <TimesheetForm
            isBillable={isBillable}
            setIsBillable={setIsBillable}
            company={company}
            setCompany={setCompany}
            project={project}
            setProject={setProject}
            workArea={workArea}
            setWorkArea={setWorkArea}
            taskArea={taskArea}
            setTaskArea={setTaskArea}
            ticket={ticket}
            setTicket={setTicket}
            handleAddToSheet={handleAddToSheet}
            selectedWeek={weekStartDate}
          />

          <TimesheetTable
            entries={entries}
            setEntries={setEntries}
            weekStartDate={weekStartDate}
            empId={employee}
            isBillable={isBillable}
            handleHourChange={handleHourChange}
            handleNoteChange={handleNoteChange}
            handleRemoveEntry={handleRemoveEntry}
            handleSave={handleSave}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
          />

          {showSuccess && (
            <div className="mt-4 text-green-700 bg-green-100 px-4 py-2 rounded text-sm">
              ✅ Timesheet saved successfully!
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageTimesheet;
