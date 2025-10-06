import React from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isWithinInterval } from "date-fns";

const TimesheetHeader = ({
  userRole,
  employee,
  setEmployee,
  employeeOptions,
  weekStartDate,
  setWeekStartDate,
  calendarOpen,
  setCalendarOpen,
  showTimesheetFields,
  setShowTimesheetFields,
}) => {
  const navigate = useNavigate();

  // ✅ When user selects a date, adjust to nearest Monday
  const handleDateSelect = (date) => {
    const selected = new Date(date);
    const monday = new Date(selected.setDate(selected.getDate() - ((selected.getDay() + 6) % 7)));
    setWeekStartDate(monday);
  };

  // ✅ Format selected week for display
  const getWeekRange = () => {
    if (!weekStartDate) return "";
    const end = addDays(weekStartDate, 6);
    return `${format(weekStartDate, "MMM d")} - ${format(end, "MMM d")}`;
  };

  // ✅ Highlight selected week in calendar
  const isDateInWeek = (date) => {
    if (!weekStartDate) return false;
    return isWithinInterval(date, {
      start: weekStartDate,
      end: addDays(weekStartDate, 6),
    });
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Employee Dropdown */}
      <div className="flex flex-col text-sm">
        <label className="mb-1 font-medium">*Employee Name</label>
        <select
          value={employee}
          onChange={(e) => setEmployee(parseInt(e.target.value))}
          disabled={userRole === "Basic" || userRole === "Basic User"}
          className="border rounded px-3 py-2 min-w-[200px]"
        >
          <option value="">Select Employee</option>
          {employeeOptions
            .filter(emp => emp.full_name && emp.emp_id)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.full_name}
              </option>
            ))}

        </select>
      </div>

      {/* Week Picker */}
      <div className="flex flex-col text-sm relative">
        <label className="mb-1 font-medium">*Week</label>
        <button
          onClick={() => setCalendarOpen(true)}
          className="border rounded px-3 py-2 text-left bg-white dark:bg-gray-800 min-w-[200px]"
        >
          {weekStartDate ? getWeekRange() : "Select Week"}
        </button>

        {calendarOpen && (
          <div className="absolute z-20 mt-16 bg-white dark:bg-gray-800 rounded shadow-md w-[250px]">
            <div className="bg-purple-900 text-white text-center py-2 text-sm">
              <div className="uppercase text-xs">Selected Week</div>
              <div className="font-medium">{getWeekRange()}</div>
            </div>

            <DatePicker
              selected={weekStartDate}
              onChange={handleDateSelect}
              inline
              calendarStartDay={0}
              dayClassName={(date) =>
                isDateInWeek(date) ? "react-datepicker__day--highlighted-week" : undefined
              }
            />

            <div className="flex justify-end px-3 py-2 border-t">
              <button
                onClick={() => setCalendarOpen(false)}
                className="text-xs text-gray-600 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCalendarOpen(false);
                  setShowTimesheetFields(true);
                }}
                className="text-xs bg-orange-500 text-white px-3 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Report Button (Admin/Super Admin Only) Button is not best practice*/}
      {(userRole === "Admin" || userRole === "Super Admin") && (
        <button
          onClick={() => navigate("/timesheet-weekly-hours-report")}
          className="ml-auto border text-purple-700 px-4 py-2 rounded hover:bg-purple-50 text-sm"
        >
          Weekly Task Summary
        </button>
      )}

      {/*{(userRole === "Admin" || userRole === "Super Admin") && (
        <button
          onClick={() => navigate("/timesheet-hours-report")}
          className="ml-auto border text-purple-700 px-4 py-2 rounded hover:bg-purple-50 text-sm"
        >
          View Report by Total Hours
        </button>
      )}*/}

      {(userRole === "Admin" || userRole === "Super Admin") && (
        <button
          onClick={() => navigate("/timesheet-daily-hours-report")}
          className="ml-auto border text-purple-700 px-4 py-2 rounded hover:bg-purple-50 text-sm"
        >
          Daily Task Summary
        </button>
      )}
    </div>
  );
};

export default TimesheetHeader;
