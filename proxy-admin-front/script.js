  
//TODO set by config
//var REST_API = "http://localhost:3001";
var REST_API = "http://3.141.39.176:8081";

function getItems() {
    xhrGet(REST_API+"/quotas", function (responseText) {
    	try {
    		console.log(responseText);
	        var responseJSON = JSON.parse(responseText);
    		console.log(responseJSON);
	        loadTable(responseJSON.data);
        }
		catch(e) {
			console.log("no items");
		}
    }, function(err){
    	console.error(err);
    });
}

function getHits() {
    xhrGet(REST_API+"/hits", function (responseText) {
    	try {
    		console.log(responseText);
	        var responseJSON = JSON.parse(responseText);
    		console.log(responseJSON);
	        loadTableHits(responseJSON.data);
        }
		catch(e) {
			console.log("no items");
		}
    }, function(err){
    	console.error(err);
    });
}


function flushRedis() {
    xhrPostJSON(REST_API+"/flush",{}, function (responseText) {
    	console.log(responseText);
        alert("Redis Flushed");
    }, function(err){
    	console.error(err);
    });
}

function loadTableHits(rows) {
    var tableBody = document.getElementById('tblHits').getElementsByTagName('tbody')[0];
    var newTableBody = document.createElement('tbody');

    for (i = 0; i < rows.length; ++i) {
        var row = rows[i];
        console.log(JSON.stringify(row));

        var tr = document.createElement('TR');

        var td = document.createElement('TD');
        td.innerHTML = row.countId;
        tr.appendChild(td);

        var td = document.createElement('TD');
        td.innerHTML = row.hits;
        tr.appendChild(td);

        var td = document.createElement('TD');
        td.innerHTML = row.ttl;
        tr.appendChild(td);

        newTableBody.appendChild(tr);
    }
    tableBody.parentNode.replaceChild(newTableBody, tableBody);
}

function loadTable(rows) {
    var tableBody = document.getElementById('tblTodo').getElementsByTagName('tbody')[0];
    var newTableBody = document.createElement('tbody');

    for (i = 0; i < rows.length; ++i) {
        var row = rows[i];
        console.log(JSON.stringify(row));

        var tr = document.createElement('TR');

        var td = document.createElement('TD');
        var type = row.quotaId.split('-')[1];
        td.innerHTML = type;
        tr.appendChild(td);

        var td = document.createElement('TD');
        var value = row.quotaId.split('-')[2];
        td.innerHTML = value;
        tr.appendChild(td);

        var td = document.createElement('TD');
        td.innerHTML = row.data.limit;
        tr.appendChild(td);
        
        var td = document.createElement('TD');
        td.innerHTML = row.data.ttl;
        tr.appendChild(td);

        var td = document.createElement('TD');

        var btnRemove = document.createElement('input');
        btnRemove.id = "btnRemove";
        btnRemove.value = "Remove";
        btnRemove.type = "button";
        btnRemove.setAttribute("onclick", "deleteItem(this.parentNode, '" + row.quotaId + "')");
        btnRemove.setAttribute("class", "btn-default");
        td.appendChild(btnRemove);

        tr.appendChild(td);

        newTableBody.appendChild(tr);
    }
    tableBody.parentNode.replaceChild(newTableBody, tableBody);
}



function deleteItem(deleteBtnNode, id) {
    var row = deleteBtnNode.parentNode;
    xhrDelete(REST_API+"/quotas/" + encodeURIComponent(id), function () {
        row.parentNode.removeChild(row);
    }, function (err) {
        console.error(err);
    });
}

function saveItem () {
    var vtype = document.getElementById('selType').value;
    var vlimit = document.getElementById('txtLimit').value;
    var vvalue = document.getElementById('txtValue').value;
    var vttl = document.getElementById('txtTtl').value;
    
    var data = {
    	type: vtype,
    	limit: vlimit,
    	ttl: vttl,
        value: vvalue
    };

    console.log(data);

    xhrPostJSON(REST_API+"/quotas", data, function (responseText) {
        console.log("inserted");
        getItems();
        clearForm();
    }, function (err) {
        console.error(err);
    });
        
}


function clearForm() {
    document.getElementById('selType').value = "";
    document.getElementById('txtLimit').value = "";
    document.getElementById('txtValue').value = "";
    document.getElementById('txtTtl').value = "";
}
