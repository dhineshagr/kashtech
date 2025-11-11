import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api/config";
import { startOfWeek } from "date-fns";

const DailyTimesheetReport = () => {
    const [reportData, setReportData] = useState([]);
    const [expandedRows, setExpandedRows] = useState([]);
    const [visibleNotes, setVisibleNotes] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
    const [showFilters, setShowFilters] = useState(false);
    const [filterOption, setFilterOption] = useState("monthToDate");
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [selectedType, setSelectedType] = useState("");
    const [selectedClients, setSelectedClients] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isBillable, setIsBillable] = useState(true);
    const [isNonBillable, setIsNonBillable] = useState(false);
    const [clientList, setClientList] = useState([]);
    const [clientProjects, setClientProjects] = useState([]); 
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const fetchReport = async (customParams = {}) => {

        console.log("Fetching report with params:", customParams);

        try {
            let url = API.TIMESHEET_DAILY_REPORT;
            let params = {};

            if (filterOption === "monthToDate") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(now, "yyyy-MM-dd");
            } else if (filterOption === "lastMonth") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(end, "yyyy-MM-dd");
            } else if (filterOption === "customRange" && customStartDate && customEndDate) {
                params.startDate = format(customStartDate, "yyyy-MM-dd");
                params.endDate = format(customEndDate, "yyyy-MM-dd");
            }

            Object.assign(params, customParams);

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            // 🚨 Check if response is unexpected HTML (e.g., session timeout)
            if (res.headers["content-type"]?.includes("text/html")) {
                console.warn("⚠️ Received HTML instead of JSON. Possible session timeout.");
                alert("Session may have expired. Please log in again.");
                return;
            }

            console.log("Fetched Daily report data:", res.data);

            setReportData(Array.isArray(res.data) ? res.data : []);
            setCurrentPage(1);
        } catch (err) {
            console.error("❌ Failed to fetch report data", err);
        }
    };

const buildStructuredFilters = () => {
  return selectedClients.map((client) => {
    const clientGroup = clientProjects.find((c) => c.clientName === client);
    if (!clientGroup) return { client, projects: [] };

    // Trim and normalize all names before comparing
    const matchingProjects = selectedProjects
      .map((p) => p.trim()) // 🔥 ensure no leading/trailing space
      .filter((proj) =>
        clientGroup.projects.some(
          (cp) =>
            cp.project_category?.trim() === proj ||
            cp.project_name?.trim() === proj
        )
      )
      .map((proj) => {
        const found = clientGroup.projects.find(
          (cp) =>
            cp.project_category?.trim() === proj ||
            cp.project_name?.trim() === proj
        );
        return found?.project_category?.trim() || proj;
      });

    return { client: client.trim(), projects: matchingProjects };
  });
};



 const buildFilterParams = () => {
  const params = {};

  // Clients
  if (selectedClients.length > 0) {
    params.clients = selectedClients.join(",");
  }

  // Projects
  if (selectedProjects.length > 0) {
    params.projects = selectedProjects;
  }

  // Employees
  if (selectedEmployees.length > 0) {
    params.employees = selectedEmployees.join(",");
  }

  // Billable flags
  if (isBillable && !isNonBillable) params.billable = "true";
  else if (!isBillable && isNonBillable) params.billable = "false";

  // Date filters
  if (filterOption === "monthToDate") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    params.startDate = format(start, "yyyy-MM-dd");
    params.endDate = format(now, "yyyy-MM-dd");
  } else if (filterOption === "lastMonth") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    params.startDate = format(start, "yyyy-MM-dd");
    params.endDate = format(end, "yyyy-MM-dd");
  } else if (filterOption === "customRange" && customStartDate && customEndDate) {
    params.startDate = format(customStartDate, "yyyy-MM-dd");
    params.endDate = format(customEndDate, "yyyy-MM-dd");
  }

  // ✅ Correct param key for backend (expects `filters`)
  const structuredFilters = buildStructuredFilters();
  if (structuredFilters.length > 0) {
    params.filters = JSON.stringify(structuredFilters);
  }

  return params;
};




    useEffect(() => {
    fetchReport(buildFilterParams());
    }, [filterOption, customStartDate, customEndDate, selectedClients, selectedProjects, selectedEmployees, isBillable, isNonBillable]);


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
    fetchReport(buildFilterParams());
    setShowFilters(false);
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
            const res = await axios.get(API.GET_CLIENTS_BY_BILLABLE(true), {
                headers: { Authorization: `Bearer ${token}` },
            });
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
    // Dropdown onChange updated to use API constant
    const handleClientChange = async (e) => {
        const selectedClient = e.target.value;
        setSelectedClients((prev) => [...prev, selectedClient]);

        const selectedObj = clientList.find((c) => c.company_name === selectedClient);
        if (selectedObj?.company_id) {
            setSelectedCompanyId(selectedObj.company_id);
            await fetchProjectList(selectedObj.company_id);
        }
    };

    const fetchProjectList = async (companyId) => {
        try {
            const res = await axios.get(`/api/timesheet/projects/${companyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjectList(res.data);
        } catch (err) {
            console.error("❌ Error fetching projects", err);
        }
    };

 useEffect(() => {
  const fetchInitialLists = async () => {
    try {
      let clients = [];

      // 🔹 Case 1: Only Billable
      if (isBillable && !isNonBillable) {
        const res = await axios.get(API.GET_CLIENTS_BY_BILLABLE(true), {
          headers: { Authorization: `Bearer ${token}` },
        });
        clients = res.data;
      }
      // 🔹 Case 2: Only Non-Billable
      else if (!isBillable && isNonBillable) {
        const res = await axios.get(API.GET_CLIENTS_BY_BILLABLE(false), {
          headers: { Authorization: `Bearer ${token}` },
        });
        clients = res.data;
      }
      // 🔹 Case 3: Both checked — merge both lists
      else if (isBillable && isNonBillable) {
        const [billableRes, nonBillableRes] = await Promise.all([
          axios.get(API.GET_CLIENTS_BY_BILLABLE(true), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(API.GET_CLIENTS_BY_BILLABLE(false), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Merge and remove duplicates by company_id
        const merged = [
          ...billableRes.data,
          ...nonBillableRes.data.filter(
            (nb) => !billableRes.data.some((b) => b.company_id === nb.company_id)
          ),
        ];

        clients = merged;
      }

      // Sort alphabetically
      const sortedClients = clients.sort((a, b) =>
        a.company_name.localeCompare(b.company_name)
      );

      setClientList(sortedClients);

      // ✅ Always refresh employee list too
      const empRes = await axios.get(API.GET_ALL_EMPLOYEES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullName = (person) =>
        `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
      const sortedEmps = empRes.data
        .filter((e) => e?.first_name || e?.last_name)
        .sort((a, b) => fullName(a).localeCompare(fullName(b)));
      setEmployeeList(sortedEmps);

    } catch (error) {
      console.error("❌ Error fetching lists:", error);
    }
  };

  fetchInitialLists();
}, [isBillable, isNonBillable]);

    // ✅ UPDATED FRONTEND FUNCTION
    const handleExportDailyExcel = async () => {
        try {
            const params = {};

            if (filterOption === "monthToDate") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(now, "yyyy-MM-dd");
            } else if (filterOption === "lastMonth") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(end, "yyyy-MM-dd");
            } else if (filterOption === "customRange" && customStartDate && customEndDate) {
                params.startDate = format(customStartDate, "yyyy-MM-dd");
                params.endDate = format(customEndDate, "yyyy-MM-dd");
            } else {
                alert("Please select a valid date range.");
                return;
            }

            // Optional employee filter
            if (selectedEmployees.length > 0) {
                params.emp_ids = selectedEmployees
                    .map((name) =>
                        employeeList.find((emp) => `${emp.first_name} ${emp.last_name}` === name)?.emp_id
                    )
                    .filter(Boolean)
                    .join(",");
            }

            console.log("📤 Export Params:", params);

            const res = await axios.get(API.TIMESHEET_DAILY_HOURS_REPORT, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            if (!res.data || res.data.length === 0) {
                alert("No data available for the selected date range.");
                return;
            }

            const sorted = res.data.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
            const worksheet = XLSX.utils.json_to_sheet(sorted);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Timesheet");

            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            saveAs(new Blob([excelBuffer]), "daily_timesheet_report.xlsx");
        } catch (err) {
            console.error("❌ Failed to export daily Excel", err);
        }
    };


    const removeClient = (clientToRemove) => {
        setSelectedClients((prev) => prev.filter((c) => c !== clientToRemove));
        setClientProjects((prev) => prev.filter((c) => c.clientName !== clientToRemove));
        setSelectedProjects((prev) =>
            prev.filter((proj) => {
            const group = clientProjects.find((g) => g.projects.some((p) => p.project_category === proj));
            return !group || group.clientName !== clientToRemove;
            })
        );
    };



    const handleExportCSV = async () => {
        try {
            const params = {};

            // Apply date filters
            if (filterOption === "monthToDate") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(now, "yyyy-MM-dd");
            } else if (filterOption === "lastMonth") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.startDate = format(start, "yyyy-MM-dd");
                params.endDate = format(end, "yyyy-MM-dd");
            } else if (filterOption === "customRange" && customStartDate && customEndDate) {
                params.startDate = format(customStartDate, "yyyy-MM-dd");
                params.endDate = format(customEndDate, "yyyy-MM-dd");
            } else {
                alert("Please select a valid date range.");
                return;
            }

            // Add employee filter
            if (selectedEmployees.length > 0) {
                params.emp_ids = selectedEmployees
                    .map(name => employeeList.find(emp => `${emp.first_name} ${emp.last_name}` === name)?.emp_id)
                    .filter(Boolean)
                    .join(",");
            }

            const res = await axios.get(API.TIMESHEET_DAILY_HOURS_REPORT, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            if (!res.data || res.data.length === 0) {
                alert("No data available for the selected filters.");
                return;
            }

            const csvContent = [
                Object.keys(res.data[0]).join(","), // CSV Header
                ...res.data.map(row => Object.values(row).map(val => `"${val}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, "daily_timesheet_report.csv");
        } catch (err) {
            console.error("❌ Failed to export CSV:", err);
        }
    };
    return (
        <div className="min-h-screen text-gray-800 dark:text-white px-6 py-6">
            {/* Rest of your JSX stays unchanged... */}

            <h2 className="text-4xl font-bold mb-6 text-purple-900 dark:text-white">
                Daily Breakdown
            </h2>

            <div className="flex justify-between items-center mb-6 flex-wrap">
                <div className="flex flex-wrap items-center gap-3 mb-4 relative">
                    <select
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        className="border text-sm rounded pl-2 pr-8 py-1"
                    >
                        <option value="monthToDate">Month to Date</option>
                        <option value="lastMonth">Last Month</option>
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
                                            if (!selectedClient || selectedClients.includes(selectedClient)) return;

                                            setSelectedClients((prev) => [...prev, selectedClient]);

                                            const selectedObj = clientList.find(c => c.company_name === selectedClient);
                                            if (!selectedObj?.company_id) return;

                                            try {
                                            const projRes = await axios.get(
                                                API.GET_PROJECTS_BY_COMPANY(selectedObj.company_id),
                                                { headers: { Authorization: `Bearer ${token}` } }
                                            );

                                            const sortedProjects = projRes.data.sort((a, b) =>
                                                a.project_category.localeCompare(b.project_category)
                                            );

                                            setClientProjects((prev) => {
                                                // remove old group for this client if re-selected
                                                const filtered = prev.filter(p => p.clientName !== selectedClient);
                                                return [...filtered, { clientName: selectedClient, projects: sortedProjects }];
                                            });
                                            } catch (err) {
                                            console.error("❌ Error fetching projects", err);
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
                                                    <button onClick={() => removeClient(client)}>✕</button>
                                                </span>
                                            ))}
                                        </div>

                                        {selectedClients.length > 0 && clientProjects.length > 0 && (
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

                                            {clientProjects.map((group, idx) => (
                                            <optgroup key={idx} label={group.clientName}>
                                                {group.projects.map((proj) => (
                                                <option key={proj.sow_id} value={proj.project_category}>
                                                    {proj.project_category}
                                                </option>
                                                ))}
                                            </optgroup>
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
                    <button
                        onClick={handleExportCSV}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                        Export CSV
                    </button>

                    <button
                        onClick={handleExportDailyExcel}
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
                            // Generate dates for Mon–Sun based on period_start_date
                            const weekDates = Array.from({ length: 7 }, (_, i) => {
                            const d = new Date(startDate);
                            d.setDate(startDate.getDate() + i);
                            return d;
                            });


                            return (
                                <React.Fragment key={idx}>
                                    <tr className="border-b dark:border-gray-700">
                                        <td className="py-2 px-4">{row.employee_name}</td>
                                        <td className="py-2 px-4">
                                            {String(row.billable).toLowerCase() === "true" ? "Billable" : "Non-Billable"}
                                        </td>
                                        <td className="py-2 px-4">{row.company_name}</td>
                                        <td className="py-2 px-4">{row.project_category}</td>
                                        <td className="py-2 px-4 text-purple-600 hover:underline text-sm cursor-pointer">
                                            <button onClick={() => toggleRow(idx)}>
                                                {isExpanded ? "− Less Info" : "+ More Info"}
                                            </button>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="bg-gray-100 dark:bg-gray-700 text-xs">
                                            <td colSpan={6} className="py-3 px-4">
                                                {/* 3-column grid: left info, middle details, right notes */}
                                                {/* <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,260px)] gap-6 items-start"> */}
                                                <div className="grid grid-cols-1
                                                    md:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,260px)]
                                                    lg:grid-cols-[minmax(220px,280px)_0.7fr_minmax(220px,260px)]
                                                    gap-6 items-start
                                                    ">

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
                                                        <div className="font-semibold mb-1">Timesheet Entry Details</div>
                                                        <div className="grid grid-cols-8 gap-2 text-center font-mono tabular-nums">
                                                        <div>
                                                            Mon<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[0], "MM/dd")}</span> <br />
                                                            {row.monday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Tue<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[1], "MM/dd")}</span> <br />
                                                            {row.tuesday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Wed<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[2], "MM/dd")}</span> <br />
                                                            {row.wednesday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Thu<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[3], "MM/dd")}</span> <br />
                                                            {row.thursday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Fri<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[4], "MM/dd")}</span> <br />
                                                            {row.friday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Sat<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[5], "MM/dd")}</span> <br />
                                                            {row.saturday_hours}<br />
                                                        </div>
                                                        <div>
                                                            Sun<br />
                                                            <span className="text-xs text-gray-500">{format(weekDates[6], "MM/dd")}</span> <br />
                                                            {row.sunday_hours}<br />
                                                        </div>
                                                        <div className="font-bold text-purple-700">
                                                            Total<br />
                                                            {totalHours.toFixed(2)}
                                                        </div>
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

export default DailyTimesheetReport;