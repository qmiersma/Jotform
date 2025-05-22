class Search {
    constructor(url, options) {
        this.url = url; 
        this.options = options; 
        this.featureData = [];
        this.searchResults = [];
        this.lastSearched = ""; // optional caching optimization
    }

    async getFeatureData(inputString) {
        if (inputString === this.lastSearched) return; // Skip refetching same term

        this.lastSearched = inputString;

        let searchString = inputString.replace(' ', '%25');
        searchString = `%27%25${searchString}%25%27`;

        const recordCount = 25; // bumped record count to allow more results for better matching

        try {
            const response = await fetch(this.url);

            if (!response.ok) throw new Error("Failed to fetch address points"); 

            const data = await response.json();
            this.featureData = [...data.features];
        } catch(error) {
            console.log(error); 
        }
    }

    async search(term) {
        await this.getFeatureData(term);
        const fuse = new Fuse(this.featureData, this.options);
        this.searchResults = fuse.search(term).slice(0, 10);
    }
}

const url = `https://gis.southbendin.gov/arcgis/rest/services/LandRecords/AddressPoints/MapServer/0/query?where=street_address+like+${searchString}+OR+PARCELID+LIKE+${searchString}+OR+PARCELSTAT+LIKE+${searchString}&outFields=OBJECTID,Zip,City,State,PARCELID,PARCELSTAT,Street_Address,Street_Number,Street_Dir,Street_Name,Street_Suffix,Post_Street_Dir,Street_Qual_Post,Street_Apt_Num,GlobalID&f=json&resultRecordCount=${recordCount}`; 

const options = {
    shouldSort: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 64,
    minMatchCharLength: 2,
    keys: [
        "attributes.Street_Address",
        "attributes.PARCELID",
        "attributes.PARCELSTAT"
    ]
};

//always subscribe to ready event and implement widget related code
//inside callback function , it is the best practice while developing widgets
const gisSearch = new Search(url, options);

document.getElementById("userInput").addEventListener("keyup", async (e) => {
    const currentInput = e.target.value;
    if (currentInput.length > 2) {
        const results = await liveSearch(currentInput);
        showResults(results);
    } else {
        resultsContainer.style.display = 'none';
    }
});

const liveSearch = async (currentInput) => {
    await gisSearch.search(currentInput);
    const results = gisSearch.searchResults.map((result) => {
        let fullAddress = `${result.item.attributes.Street_Address} ${result.item.attributes.City}, ${result.item.attributes.State} ${result.item.attributes.Zip}`;
        return {
            address: fullAddress,
            parcelId: result.item.attributes.PARCELID,
        };
    }); 
    
    return results;
};

function showResults(results) {
    resultsContainer.innerHTML = '';
    if (results.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    results.forEach((result) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = result.address;
        div.addEventListener('click', () => {
            document.getElementById("userInput").value = result.address;
            resultsContainer.style.display = 'none';
        });
        resultsContainer.appendChild(div);
    });

    resultsContainer.style.display = 'block';
}

JFCustomWidget.subscribe("ready", function(){
    var label = JFCustomWidget.getWidgetSetting('QuestionLabel');
    document.getElementById('labelText').innerHTML = label;
    //subscribe to form submit event
    JFCustomWidget.subscribe("submit", function(){
        var msg = {
            //you should valid attribute to data for JotForm
            //to be able to use youw widget as required
            valid: true,
            value: document.getElementById('userInput').value
        }
        // send value to JotForm
        JFCustomWidget.sendSubmit(msg);
    });
});