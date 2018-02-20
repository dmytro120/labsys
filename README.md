# LabSys
Alternative front-end for managing databases used in an industry-standard Laboratory Information Management System (LIMS).

## Architecture
* SPA written using ES6 classes and other cutting-edge features. Only works in WebKit browsers.
* Uses LDBC for database access. LDBC is a Node.js application for Windows which:
	* Connects to databases over ODBC
	* Listens for queries from LabSys via HTTP requests to http://localhost:7000/
	* Executes queries and sends JSON in response to LabSys