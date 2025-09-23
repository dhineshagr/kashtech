const BASE_URL = "http://20.127.197.227:5000/api"; // use an env variable to derive

const API = {
  // 🔐 Auth
  AUTH_LOGIN: `${BASE_URL}/auth/login`,

  USER_RESET_PASSWORD: `${BASE_URL}/user/reset-password`,
  GET_USER_PROFILE: `${BASE_URL}/user/me`,

  // 👤 Employee APIs
  FETCH_ALL_EMPLOYEES: `${BASE_URL}/employees`,
  FETCH_ALL_EMPLOYEES1: `${BASE_URL}/employees/employees`, // consider renaming for clarity
  GET_EMPLOYEE_BY_ID: (empId) => `${BASE_URL}/employees/${empId}`,

  // 🕒 Timesheet APIs
  TIMESHEET_REPORT: `${BASE_URL}/timesheet/report`,
  TIMESHEET_ADD_BATCH: `${BASE_URL}/timesheet/add-batch`,
  UPDATE_TIMESHEET_BATCH: `${BASE_URL}/timesheet/update-entry`,
  DELETE_TIMESHEET_ENTRY: (id) => `${BASE_URL}/timesheet/delete-entry/${id}`,
  DELETE_TIMESHEET_ENTRY_BY_ID: (id) => `${BASE_URL}/timesheet/delete-entry-by-id/${id}`,
  GET_TIMESHEET_BY_WEEK: (empId, weekStartDate) =>
    `${BASE_URL}/timesheet/week/${empId}/${weekStartDate}`,
  GET_CLIENTS_BY_BILLABLE: (billable) => `${BASE_URL}/timesheet/companies?billable=${billable}`,
  GET_PROJECTS_BY_COMPANY: (companyId) => `${BASE_URL}/timesheet/projects/${companyId}`,
  TIMESHEET_HOURS_REPORT: `${BASE_URL}/timesheet/hours-report`,
  GET_ALL_CLIENTS: `${BASE_URL}/clients`,
  GET_ALL_EMPLOYEES: `${BASE_URL}/employees/allemployees`,

  TIMESHEET_DAILY_HOURS_REPORT: `${BASE_URL}/timesheet/daily-hours-report`,
  TIMESHEET_DAILY_REPORT: `${BASE_URL}/timesheet/daily-report`,

  // 🏢 Company & Project Management
  FETCH_MANAGE_CLIENTS: `${BASE_URL}/manageclients`,
  GET_CLIENT_BY_ID: (company_id) => `${BASE_URL}/manageclients/${company_id}`,

  GET_COMPANIES_BY_BILLABLE: (isBillable) =>
    `${BASE_URL}/timesheet/companies?billable=${isBillable}`,
  CLIENT_PROJECTS: `${BASE_URL}/dashboard/client-projects`,

  // 🛠️ Full Project Management APIs (for ManageProjects.jsx)
  PROJECTS_BY_COMPANY: (companyId) => `${BASE_URL}/projects/company/${companyId}`, // ✅ get projects by company
  GET_ALL_PROJECTS: `${BASE_URL}/projects`, // ✅ create project (POST)
  GET_PROJECT_BY_SOW_ID: (sowId) => `${BASE_URL}/projects/${sowId}`, // ✅ update (PUT) and delete (DELETE)
  FETCH_PROJECT_DETAILS: (sowId) => `${BASE_URL}/projects/${sowId}`,
  FETCH_TASKS_BY_PROJECT: (sowId) => `${BASE_URL}/projects/${sowId}/tasks`,
  FETCH_EMPLOYEES_BY_PROJECT: (sowId) => `${BASE_URL}/projects/${sowId}/employees`,

  ASSIGN_ROLE: `${BASE_URL}/projects/assign-role`,
  ASSIGN_EMPLOYEE: `${BASE_URL}/projects/assign-employee`,
  GET_PROJECT_ASSIGNMENTS: (sowId) => `${BASE_URL}/projects/${sowId}/assignments`,
  DELETE_PROJECT_ROLE: (sowId, roleId) => `${BASE_URL}/projects/${sowId}/role/${roleId}`,
  DELETE_ROLE_EMPLOYEE: (sowId, roleId, empId) => `${BASE_URL}/projects/${sowId}/role/${roleId}/employee/${empId}`,
  GET_ROLE_BREAKDOWN_BY_PROJECT: (sowId) => `${BASE_URL}/projects/${sowId}/role-breakdown`,
  GET_INDUSTRIES: `${BASE_URL}/manageclients/industries`,
  CREATE_INDUSTRY: `${BASE_URL}/manageclients/industries`,
  CREATE_ROLE: `${BASE_URL}/projects/roles`, // POST
  GET_PROJECT_HEADER_INFO: (sowId) => `${BASE_URL}/projects/${sowId}/info`,

  // 🔄 Project Subcategories & Tasks
  GET_AREAS_BY_PROJECT: (projectId) => `${BASE_URL}/timesheet/areas/${projectId}`,
  GET_TASK_AREAS_BY_PROJECT_AND_WORKAREA: (sowId, workArea) =>
    `${BASE_URL}/timesheet/task-areas/${sowId}/${encodeURIComponent(workArea)}`,

  // 📊 Metrics (Dashboard)
  TOTAL_PROJECTS: `${BASE_URL}/metrics/total-projects`,
  ACTIVE_PROJECTS: `${BASE_URL}/metrics/active-projects`,
  CLIENTS: `${BASE_URL}/metrics/clients`,
  EMPLOYEES_ASSIGNED: `${BASE_URL}/metrics/employees-assigned`,
  AVG_HOURS_BILLED: `${BASE_URL}/metrics/avg-hours-billed`,

  // 🧠 OpenAI (SOW Generation)

  OPENAI_GENERATE_SOW_HTML: `${BASE_URL}/openai/generate-preview-doc`,
  OPENAI_EDIT_DOC: `${BASE_URL}/openai/edit-doc`,
  OPENAI_SAVE_FINAL_DOC: `${BASE_URL}/openai/save-edited-doc`,
  OPENAI_DOWNLOAD_FINAL_DOC: `${BASE_URL}/openai/download-edited-doc`,

  OPENAI_GENERATE_MSA_HTML: `${BASE_URL}/openai/generate-preview-msa`,
  OPENAI_SAVE_MSA_DOC: `${BASE_URL}/openai/save-edited-msa-doc`,
  OPENAI_DOWNLOAD_MSA_DOC: `${BASE_URL}/openai/download-edited-msa-doc`,

  GET_ADMINS_BY_COMPANY: `${BASE_URL}/admins/company`,
  ADD_COMPANY_ADMIN: `${BASE_URL}/admins/company/add`,
  DELETE_COMPANY_ADMIN: `${BASE_URL}/admins/company`,
  GET_ALL_COMPANY_ADMINS: `${BASE_URL}/admins/all-admins`,
  FETCH_ADMIN_EMPLOYEES: `${BASE_URL}/admins/employees`,


  // 📄 Invoice APIs
  FETCH_ALL_INVOICES: `${BASE_URL}/invoices`,
  FETCH_INVOICE_BY_ID: (id) => `${BASE_URL}/invoices/${id}`,
  CREATE_INVOICE: `${BASE_URL}/invoices`,
  DELETE_INVOICE: (id) => `${BASE_URL}/invoices/${id}`,
  FETCH_ROLES: `${BASE_URL}/roles`,
  UPDATE_INVOICE: (id) => `${BASE_URL}/invoices/${id}`,

  // 🔽 Invoice Dropdown Support APIs
  GET_ALL_COMPANIES: `${BASE_URL}/clients`, // for company dropdown
  GET_PROJECTS_BY_COMPANY_INVOICE: (companyId) => `${BASE_URL}/projects/company/${companyId}`, // projects by company
  GET_EMPLOYEES_BY_PROJECT: (sowId) => `${BASE_URL}/invoices/employees/by-project/${sowId}`,
  GET_ROLES_BY_PROJECT: (sowId) => `${BASE_URL}/projects/${sowId}/roles`,
  GET_EMPLOYEES_BY_PROJECT_AND_ROLE: (sowId, roleId) => `${BASE_URL}/projects/${sowId}/roles/${roleId}/employees`,
  GET_ALL_COMPANIES_INVOICE: `${BASE_URL}/invoices/companies`,
  GET_INVOICE_TIMESHEET_DATA: `${BASE_URL}/invoices/timesheet/invoice-data`,
  FETCH_INVOICE_DETAILS_BY_ID: (id) => `${BASE_URL}/invoices/${id}/details`, // ✅ NEW: For invoice line items


};
export default API;
