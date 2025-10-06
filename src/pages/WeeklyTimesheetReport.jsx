// WeeklyTimesheetReport.jsx for Weekly Hours Report
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api/config";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";


const WeeklyTimesheetReport = () => {
    const [reportData, setReportData] = useState([]);
    const [expandedRows, setExpandedRows] = useState([]);
    const [visibleNotes, setVisibleNotes] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
    const [showFilters, setShowFilters] = useState(false);
    const [filterOption, setFilterOption] = useState("monthToDate");
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);

    const [selectedClients, setSelectedClients] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isBillable, setIsBillable] = useState(true);
    const [isNonBillable, setIsNonBillable] = useState(false);
    const [clientList, setClientList] = useState([]);
    const [projectList, setProjectList] = useState([]);
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const fetchReport = async (customParams = {}) => {
        try {
            let url = API.TIMESHEET_REPORT;

            const baseDateParams = buildWeekDateParams();
            const params = { ...baseDateParams, ...customParams };

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            if (res.headers["content-type"]?.includes("text/html")) {
                console.warn("⚠️ Received HTML instead of JSON. Possible session timeout.");
                alert("Session may have expired. Please log in again.");
                return;
            }

            console.log("Fetched Weekly report data:", res.data);

            setReportData(Array.isArray(res.data) ? res.data : []);
            setCurrentPage(1);

        } catch (err) {
            console.error("❌ Failed to fetch report data", err);
        }
    };


    useEffect(() => { // Use effect isn't used to fetch data in a well built react system
        fetchReport();
    }, [filterOption, customStartDate, customEndDate]);

    useEffect(() => {
        fetchClientList();
        fetchEmployeeList();
    }, []);

    const clearAllFilters = () => {
        setSelectedClients([]);
        setSelectedProjects([]);
        setSelectedEmployees([]);
        setIsBillable(true);
        setIsNonBillable(false);

        fetchReport(); // ✅ fetch base data again with default params
    };


    const applyFilters = () => {
        const params = {};

        if (selectedClients.length > 0) params.clients = selectedClients.join(",");
        if (selectedProjects.length > 0) params.projects = selectedProjects.join(",");
        if (selectedEmployees.length > 0) params.employees = selectedEmployees.join(",");

        if (isBillable && !isNonBillable) params.billable = "true";
        else if (!isBillable && isNonBillable) params.billable = "false";

        // Weekly date params
        Object.assign(params, buildWeekDateParams());

        fetchReport(params);
        setShowFilters(false);
    };

    const weekBounds = (date) => ({
        start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(date, { weekStartsOn: 1 }),     // Sunday
    });

    const buildWeekDateParams = () => {
        const now = new Date();

        if (filterOption === "currentWeek") {
            const { start, end } = weekBounds(now);
            return {
                startDate: format(start, "yyyy-MM-dd"),
                endDate: format(end, "yyyy-MM-dd"),
            };
        }

        if (filterOption === "last4Weeks") {
            // From Monday of 3 weeks ago (inclusive) through end of this week (inclusive)
            const { start: currentStart, end: currentEnd } = weekBounds(now);
            const start = startOfWeek(subWeeks(currentStart, 3), { weekStartsOn: 1 });
            return {
                startDate: format(start, "yyyy-MM-dd"),
                endDate: format(currentEnd, "yyyy-MM-dd"),
            };
        }

        if (filterOption === "last12Weeks") {
            const { start: currentStart, end: currentEnd } = weekBounds(now);
            const start = startOfWeek(subWeeks(currentStart, 11), { weekStartsOn: 1 });
            return {
                startDate: format(start, "yyyy-MM-dd"),
                endDate: format(currentEnd, "yyyy-MM-dd"),
            };
        }

        if (filterOption === "customRange" && customStartDate && customEndDate) {
            // Snap custom range to week boundaries to stay “weekly”
            const { start } = weekBounds(customStartDate);
            const { end } = weekBounds(customEndDate);
            return {
                startDate: format(start, "yyyy-MM-dd"),
                endDate: format(end, "yyyy-MM-dd"),
            };
        }

        // Fallback: current week
        const { start, end } = weekBounds(now);
        return {
            startDate: format(start, "yyyy-MM-dd"),
            endDate: format(end, "yyyy-MM-dd"),
        };
    };

    const toggleRow = (idx) => {
        setExpandedRows((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
        setVisibleNotes((prev) => prev.filter((i) => i !== idx));
    };

    const toggleNotes = (idx) => {
        setVisibleNotes((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...reportData].sort((a, b) => {
        const aVal = sortConfig.key === "period_start_date"
            ? new Date(a[sortConfig.key])
            : (a[sortConfig.key] || "").toString().toLowerCase();

        const bVal = sortConfig.key === "period_start_date"
            ? new Date(b[sortConfig.key])
            : (b[sortConfig.key] || "").toString().toLowerCase();

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentData = sortedData.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([excelBuffer]), "timesheet_report.xlsx");
    };

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const token = localStorage.getItem("token");

                const [clientsRes, projectsRes, employeesRes] = await Promise.all([
                    axios.get(API.GET_ALL_CLIENTS, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(API.GET_ALL_PROJECTS, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(API.GET_ALL_EMPLOYEES, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                setClientList(clientsRes.data);
                setProjectList(projectsRes.data);
                setEmployeeList(employeesRes.data);
            } catch (err) {
                console.error("❌ Error loading dropdown data", err);
            }
        };

        fetchDropdownData();
    }, []);

    const fetchClientList = async () => {
        try {

            const res = await axios.get(API.GET_COMPANIES_BY_BILLABLE(true), {
                headers: { Authorization: `Bearer ${token}` },
            });

            // console.log("Fetched client list:", res.data);
            
            setClientList(res.data);
        } catch (err) {
            console.error("❌ Error fetching clients", err);
        }
    };

    const fetchEmployeeList = async () => {
        try {
            const res = await axios.get(API.GET_ALL_EMPLOYEES, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.headers["content-type"]?.includes("text/html")) {
                console.warn("❌ Received HTML instead of JSON for /api/allemployees");
                return;
            }

            setEmployeeList(res.data || []);
        } catch (err) {
            console.error("❌ Error fetching employees", err);
        }
    };

    useEffect(() => {
        const fetchInitialLists = async () => {
            try {
                const billableFlag = isBillable && !isNonBillable ? true :
                    !isBillable && isNonBillable ? false : null;

                // Fetch clients by billable status
                if (billableFlag !== null) {
                    const clientsRes = await axios.get(
                        API.GET_CLIENTS_BY_BILLABLE(billableFlag),
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const sortedClients = [...clientsRes.data].sort((a, b) =>
                        a.company_name.localeCompare(b.company_name)
                    );
                    setClientList(sortedClients);
                } else {
                    setClientList([]);
                }

                // Fetch employees
                const empRes = await axios.get(API.GET_ALL_EMPLOYEES, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const fullName = (person) => {
                    if (!person || typeof person !== "object") return "";
                    const first = person?.first_name ?? "";
                    const last = person?.last_name ?? "";
                    return `${first} ${last}`.trim();
                };

                const filteredEmps = Array.isArray(empRes.data)
                    ? empRes.data.filter(e => e?.first_name || e?.last_name)
                    : [];

                const sortedEmps = filteredEmps.sort((a, b) =>
                    fullName(a).localeCompare(fullName(b))
                );

                setEmployeeList(sortedEmps);


                setEmployeeList(sortedEmps);
            } catch (error) {
                console.error("❌ Error fetching lists:", error);
            }
        };

        fetchInitialLists();
    }, [isBillable, isNonBillable]);

    return (
        <div className="min-h-screen text-gray-800 dark:text-white px-6 py-6">
            {/* Rest of your JSX stays unchanged... */}

            <h2 className="text-4xl font-bold mb-6 text-purple-900 dark:text-white">
                Weekly Task Summary
            </h2>

            <div className="flex justify-between items-center mb-6 flex-wrap">
                <div className="flex flex-wrap items-center gap-3 mb-4 relative">
                    <select
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        className="border text-sm rounded pl-2 pr-8 py-1"
                    >
                        <option value="currentWeek">Current Week</option>
                        <option value="last4Weeks">Last 4 Weeks</option>
                        <option value="last12Weeks">Last 12 Weeks</option>
                        <option value="customRange">Custom Range</option>
                    </select>

                    {filterOption === "customRange" && (
                        <>
                            <DatePicker
                                selected={customStartDate}
                                onChange={(date) => setCustomStartDate(date)}
                                selectsStart
                                startDate={customStartDate}
                                endDate={customEndDate}
                                placeholderText="Start Date"
                                className="border rounded px-2 py-1 text-sm"
                            />
                            <DatePicker
                                selected={customEndDate}
                                onChange={(date) => setCustomEndDate(date)}
                                selectsEnd
                                startDate={customStartDate}
                                endDate={customEndDate}
                                placeholderText="End Date"
                                className="border rounded px-2 py-1 text-sm"
                            />
                        </>
                    )}

                    <div className="relative inline-block">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="text-sm text-purple-800 underline hover:text-purple-900"
                        >
                            Other Filters
                        </button>

                        {/* Filter popup */}
                        {showFilters && (
                            <div className="absolute z-50 top-full left-0 mt-2 w-[350px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-purple-900 dark:text-white">Other Filters</h3>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Billable Type */}
                                    <div>
                                        <p className="font-bold text-sm text-purple-900 dark:text-white">Type</p>
                                        <label className="block text-sm">
                                            <input type="checkbox" className="mr-2" checked={isBillable} onChange={() => setIsBillable(!isBillable)} /> Billable
                                        </label>
                                        <label className="block text-sm">
                                            <input type="checkbox" className="mr-2" checked={isNonBillable} onChange={() => setIsNonBillable(!isNonBillable)} /> Non-Billable
                                        </label>
                                    </div>

                                    {/* Clients and Projects */}
                                    <div>
                                        <p className="font-bold text-sm text-purple-900 dark:text-white">Client and Project</p>

                                        {/* Update in Client dropdown onChange */}
                                        <select
                                            className="w-full border px-2 py-1 text-sm rounded"
                                            onChange={async (e) => {
                                                const selectedClient = e.target.value;

                                                if (selectedClient && !selectedClients.includes(selectedClient)) {
                                                    setSelectedClients([selectedClient]);  // ✅ Safely update
                                                    setSelectedProjects([]);               // 🔄 Reset
                                                    setProjectList([]);                    // 🔄 Clear
                                                }

                                                const selectedObj = clientList.find(c => c.company_name === selectedClient);
                                                if (selectedObj?.company_id) {
                                                    try {
                                                        const projRes = await axios.get(
                                                            API.GET_PROJECTS_BY_COMPANY(selectedObj.company_id),
                                                            {
                                                                headers: { Authorization: `Bearer ${token}` },
                                                            }
                                                        );
                                                        const sortedProjects = [...projRes.data].sort((a, b) =>
                                                            a.project_category.localeCompare(b.project_category)
                                                        );
                                                        setProjectList(sortedProjects);
                                                    } catch (err) {
                                                        console.error("❌ Error fetching projects", err);
                                                    }
                                                }
                                            }}

                                        >
                                            <option value="">Select Client</option>
                                            {clientList.map((client) => (
                                                <option key={client.company_id} value={client.company_name}>
                                                    {client.company_name}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {selectedClients.map((client, idx) => (
                                                <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full">
                                                    {client}{" "}
                                                    <button onClick={() => setSelectedClients(selectedClients.filter((c) => c !== client))}>✕</button>
                                                </span>
                                            ))}
                                        </div>

                                        {selectedClients.length > 0 && projectList.length > 0 && (
                                            <select
                                                className="w-full mt-2 border px-2 py-1 text-sm rounded"
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val && !selectedProjects.includes(val)) {
                                                        setSelectedProjects([...selectedProjects, val]);
                                                    }
                                                    e.target.selectedIndex = 0;
                                                }}
                                            >
                                                <option value="">Select Project</option>
                                                {projectList.map((proj) => (
                                                    <option key={proj.sow_id} value={proj.project_category}>
                                                        {proj.project_category}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {selectedProjects.map((proj, idx) => (
                                                <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full">
                                                    {proj}{" "}
                                                    <button onClick={() => setSelectedProjects(selectedProjects.filter((p) => p !== proj))}>✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Employees */}
                                    <div>
                                        <p className="font-bold text-sm text-purple-900 dark:text-white">Employees</p>
                                        <select
                                            className="w-full border px-2 py-1 text-sm rounded"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val && !selectedEmployees.includes(val)) {
                                                    setSelectedEmployees([...selectedEmployees, val]);
                                                }
                                                e.target.selectedIndex = 0;
                                            }}
                                        >
                                            <option value="">Select Employee</option>
                                            {employeeList
                                                .filter(emp => emp && emp.emp_id)
                                                .map((emp) => {
                                                    const fullName = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || "Unnamed";
                                                    return (
                                                        <option key={emp.emp_id} value={fullName}>
                                                            {fullName}
                                                        </option>
                                                    );
                                                })}
                                        </select>



                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {selectedEmployees.map((emp, idx) => (
                                                <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full">
                                                    {emp}{" "}
                                                    <button onClick={() => setSelectedEmployees(selectedEmployees.filter((e) => e !== emp))}>✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex justify-between mt-6">
                                        <button onClick={clearAllFilters} className="text-sm text-purple-600 underline">
                                            Clear All
                                        </button>
                                        <button onClick={applyFilters} className="bg-purple-800 text-white px-4 py-1 rounded-full text-sm hover:bg-purple-900">
                                            Show Results
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}



                    </div>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                    <CSVLink
                        data={reportData}
                        filename="timesheet_report.csv"
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                        Export CSV
                    </CSVLink>
                    <button
                        onClick={handleExportExcel}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                        Export Excel
                    </button>
                    <button
                        onClick={() => navigate("/manage-timesheet")}
                        className="bg-[#F97316] hover:bg-[#ea670a] text-white font-bold py-2 px-5 rounded-full text-sm shadow-sm transition-all"
                    >
                        + Add Timesheet
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow overflow-x-auto">
                <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-purple-100 dark:bg-purple-900 text-left">
                        <tr>
                            <th className="py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort("period_start_date")}>
                                Timesheet Date
                            </th>
                            <th className="py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort("employee_name")}>
                                Employee Name
                            </th>
                            <th className="py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort("billable")}>
                                Project Type
                            </th>
                            <th className="py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort("company_name")}>
                                Company Name
                            </th>
                            <th className="py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort("project_category")}>
                                Project Name
                            </th>
                            <th className="py-3 px-4 font-semibold text-center">Actions</th>
                            <th className="py-3 px-4 font-semibold">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((row, idx) => {
                            const isExpanded = expandedRows.includes(idx);
                            const showNote = visibleNotes.includes(idx);
                            const totalHours =
                                (parseFloat(row.monday_hours) || 0) +
                                (parseFloat(row.tuesday_hours) || 0) +
                                (parseFloat(row.wednesday_hours) || 0) +
                                (parseFloat(row.thursday_hours) || 0) +
                                (parseFloat(row.friday_hours) || 0) +
                                (parseFloat(row.saturday_hours) || 0) +
                                (parseFloat(row.sunday_hours) || 0);

                            const startDate = new Date(row.period_start_date);
                            const endDate = new Date(startDate);
                            endDate.setDate(startDate.getDate() + 6);

                            return (
                                <React.Fragment key={idx}>
                                    <tr className="border-b dark:border-gray-700">
                                        <td className="py-2 px-4">
                                            {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                                        </td>
                                        <td className="py-2 px-4">{row.employee_name}</td>
                                        <td className="py-2 px-4">{row.billable ? "Billable" : "Non-Billable"}</td>
                                        <td className="py-2 px-4">{row.company_name}</td>
                                        <td className="py-2 px-4">{row.project_category}</td>
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => {
                                                    localStorage.setItem("edit_emp_id", row.emp_id);

                                                    // Normalize to Monday
                                                    const rawDate = new Date(row.period_start_date);
                                                    const day = rawDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                                                    const diffToMonday = (day + 6) % 7; // Converts Sunday (0) -> 6, Monday (1) -> 0, ..., Saturday (6) -> 5
                                                    rawDate.setDate(rawDate.getDate() - diffToMonday);

                                                    const mondayDate = rawDate.toISOString().slice(0, 10);
                                                    localStorage.setItem("edit_week_start", mondayDate);

                                                    navigate("/manage-timesheet");
                                                }}
                                                className="text-xs flex items-center gap-1 text-purple-700 hover:text-purple-900 mx-auto"
                                            >
                                                <FaEdit /> Edit
                                            </button>


                                        </td>
                                        <td className="py-2 px-4 text-purple-600 hover:underline text-sm cursor-pointer">
                                            <button onClick={() => toggleRow(idx)}>
                                                {isExpanded ? "− Less Info" : "+ More Info"}
                                            </button>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="bg-gray-100 dark:bg-gray-700 text-xs">
                                            <td colSpan={7} className="py-3 px-4">
                                                {/* 3-column grid: left info (fixed range), middle details (flex), right notes (fixed range) */}
                                                <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,260px)] gap-6 items-start">
                                                    {/* Left: meta */}
                                                    <div className="space-y-1">
                                                        <div className="grid grid-cols-[95px_1fr] gap-x-2">
                                                            <span className="font-semibold">Work Area:</span>
                                                            <span className="break-words">{row.work_area || "—"}</span>
                                                        </div>
                                                        <div className="grid grid-cols-[95px_1fr] gap-x-2">
                                                            <span className="font-semibold">Task Area:</span>
                                                            <span className="break-words">{row.task_area || "—"}</span>
                                                        </div>
                                                        <div className="grid grid-cols-[95px_1fr] gap-x-2">
                                                            <span className="font-semibold">Ticket No.:</span>
                                                            <span className="break-words">{row.ticket_num || "—"}</span>
                                                        </div>
                                                    </div>

                                                    {/* Middle: weekly hours */}
                                                    <div className="min-w-0">
                                                        <div className="font-semibold mb-1">Activity Detail</div>
                                                        <div className="grid grid-cols-8 gap-2 text-center font-mono tabular-nums">
                                                            <div>Mon<br />{row.monday_hours}</div>
                                                            <div>Tue<br />{row.tuesday_hours}</div>
                                                            <div>Wed<br />{row.wednesday_hours}</div>
                                                            <div>Thu<br />{row.thursday_hours}</div>
                                                            <div>Fri<br />{row.friday_hours}</div>
                                                            <div>Sat<br />{row.saturday_hours}</div>
                                                            <div>Sun<br />{row.sunday_hours}</div>
                                                            <div className="font-bold text-purple-700">Total<br />{totalHours.toFixed(2)}</div>
                                                        </div>
                                                    </div>

                                                    {/* Right: notes */}
                                                    <div className="flex flex-col justify-start mt-1 md:mt-0 min-w-0">
                                                        <button
                                                            onClick={() => toggleNotes(idx)}
                                                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold px-3 py-1 rounded mb-2 self-start"
                                                        >
                                                            {showNote ? "Hide Notes" : "View Notes"}
                                                        </button>

                                                        {showNote && (
                                                            <div className="text-sm italic text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                                                {row.notes || "No notes provided."}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`text-sm px-3 py-1 rounded ${currentPage === 1
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-white dark:bg-gray-700 border dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                            }`}
                    >
                        Previous
                    </button>

                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`text-sm px-3 py-1 rounded ${currentPage === totalPages
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-white dark:bg-gray-700 border dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                            }`}
                    >
                        Next
                    </button>
                </div>
            </div>


            {/* Add this inside your JSX return at the end */}



        </div>
    );
};

export default WeeklyTimesheetReport;