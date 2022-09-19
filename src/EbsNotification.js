import template from "./views/index.html";
import notFound from "./views/NotFound.html";
import main from "./views/main_head.html";
import noNotifications from "./views/no-notifications.html";
import { Observable } from 'rxjs';
import axios from 'axios';
import { QUERY,MUTATION_MODIFY } from "./utils/graphql";

/** constants needed in graphql call */
const Token = localStorage.getItem("id_token");
const headers = {
  "content-type": "application/json",
  "Authorization": `Bearer ${Token}`
};

/**Class Element declaration */
class EbsNotification extends HTMLElement {

  constructor() {
    super();
    this.totalAlerts = 0;
    this.position = "center";
    this.switchPosition = false;
    this.notifications = 0;
    this.onlyRead = false;
    this.markAllFlag = false;
    this.intervalId = "";
    this.activate_sound = true;
    this.filters = [];
    this.endPoint= "";

  }
  /**Connected callback is executed when the html element is mounted, it is async because here we call the graphql API */
  async connectedCallback() {
    let shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = template;
    /**Getting the attributes passed to the ebs-notification Web Component from the application that can be Core Breeding or Core System */
    this.contactId = this.getAttribute("contactId");
    this.endPoint = this.getAttribute("endPoint");
    this.position = this.getAttribute("position");

    /**Data fetching from graphql API */
    await this.fetchData(this.contactId, shadowRoot);// first time always when the web component is mounted

    this.intervalId = setInterval(async () => // setting a call every 10 seconds, change this approach with Reactive library
      await this.fetchData(this.contactId, shadowRoot),
      30000
    );

  }
  async fetchData(contactId, shadowRoot) {

    let list = shadowRoot.querySelector("#list-cont");
    list.innerHTML = "";
    
    /**Setting the position of the Web Component */
    let position = this.CalculatePosition(this.position);
    let box = shadowRoot.querySelector(".box");

    box.style.cssText = `left : ${position}px;`


    let arrayFilterData = await this.GraphqlCall(contactId);
    let data = arrayFilterData.data?.findJobLogList?.content;
    let totalELements = arrayFilterData.data?.findJobLogList?.totalElements;

    if(!data || totalELements === 0){
      list.innerHTML += noNotifications;
      let button_back = shadowRoot.querySelector("#go_back_button")
      button_back.addEventListener('click',()=>{
        this.switchPosition = !this.switchPosition;
        this.onlyRead = !this.onlyRead;
        this.fetchData(contactId,shadowRoot);
      })

      return;
    }
    let userName = ""
    data ? (userName = data[0].contacts[0].person.givenName + ' ' + data[0].contacts[0].person.familyName) :
      userName = "";

    let total = shadowRoot.querySelector("#total_number");
    /**Calculating the number of notifications, this number will appear in the badge, also added the shaking effect to the icon bell */
let new_notifications = data.filter(item => item.status === "unread").length;
console.log(new_notifications, this.notifications)
    if (this.notifications !== new_notifications) {
      //let total_new_notifications = new_notifications - this.notifications; // used in desktop notifications
      this.notifications = new_notifications;
      if (this.activate_sound) {
        let notificationSound =
          new Audio('https://firebasestorage.googleapis.com/v0/b/ebs-project-21967.appspot.com/o/notification-tone-swift-gesture.mp3?alt=media&token=6799f788-858d-46a2-b168-24e5dc42ca6f');
        notificationSound.play();
        let icon_bell = shadowRoot.getElementById("icon-bell");
        icon_bell.className = "shake";
        setTimeout(() => { icon_bell.className = "";  }, 1000);
      }

      //this.ShowNotification(total_new_notifications); // hide or show the desktop notifications
    }
    if(this.notifications < 1){
      total.innerHTML = "";
    }
      if(new_notifications > 0){
        total.innerHTML = new_notifications < 10 ? new_notifications : '9+'
      }


    if (data.length > 0) {// checking if there is data in the response 

      list.innerHTML = main;//adding the header in the Web Component
      let todayHeader = true;
      let olderHeader = true;
      let countTodayHeader=0;
      let countOlderHeader=0

      /**Adding the alerts, messages or request, for every occurrence this segment will be added */
      data.forEach(item => {
        let message_type = item.jobWorkflow.jobType.name;
        let workflowId = item.jobWorkflow.id;
        let objectJSON = `{"itemId":"${item.id}","workflowId":"${workflowId}"}`;
        let time = this.Calculate_Received_Time(item.startTime);
/**Calculate the Today or Older header in the messages */
        if(time.isToday){
          if( countTodayHeader === 0){
            ++countTodayHeader
            }else{
              todayHeader = false;
            }
        }else{
          if(countOlderHeader === 0){
            ++countOlderHeader;
          }else{
            olderHeader=false;
          }
        }
/**Inserting the messages */
        list.innerHTML += `
                          <div class = "sec">
                          <div class = "profCont">
                          ${ time.isToday && todayHeader  ? '<div><h3 style ="color:gray; font-family:"Raleway": font-size:10pt;">Today</h3></div>' : ''}
                          ${ !time.isToday && olderHeader ? '<div><h3 style ="color:gray; font-family:"Raleway": font-size:10pt;">Older</h3></div>' :''}                   
                        <img class = "profile" src =${message_type === "alert" ?
                          "https://firebasestorage.googleapis.com/v0/b/ebs-project-21967.appspot.com/o/bell-green.png?alt=media&token=3d1bfb72-02af-4901-bd2d-7a636f1e1d68"
                          : "https://www.freeiconspng.com/thumbs/envelope-icon/orange-envelope-icon-28.png"}>
                          </div>
                         
                          <div style ="float:right;font-size:8pt;color:gray;font-family:'Raleway'; padding-right:30px;">
                              <ul>
                                    <li class="time" style="padding:2px;float:right;"> ${time.response}
                                    </li>
                                    <br/>
                                    <br/>
                                    <li style="padding:2px;float:right;">
                                      <input type="checkbox" id='read' value=${objectJSON}  ${item.status === "unread" ? 'checked' : 'disabled'}/>
                                    </li>
                                    <br/>
                                    <br/>
                                    <li style="padding:2px; float:right;">
                                    <a id="goToActionLink" href="http://localhost:3000/sm/requestmanager?experimentId=${item.id}" style ="font-family:'Raleway';cursor:pointer;font-family:'Raleway'; font-size:8pt;">
                                    ${message_type === 'alert' ? "" : "Go to message ->"}
                                    </a>
                                    </li>
                            </ul>
                            </div>
                          <div class = "txt">
                          Hi ${userName} you got a ${message_type === "alert" ? "Notification" : "Message"} from <strong> ${item.message.sender}</strong>
                          </div>
                          <div class = "sub txt" style="color:gray; font-size:8pt;" >${item.message.message}</div>

                          <div class = "sub txt" style="color:gray; font-size:8pt;" >${item.startTime}</div>
                      </div> `;
      });
      /**Once the alerts, messages or requests are added in the Web Component set the events for the controls located in index.html, main_head.html and NotFound.html */

      let elements = shadowRoot.querySelectorAll('#read');// radio button to show the status unread=blank or read=green

      let checkboxes = [];

      let checkbox_alert = shadowRoot.querySelectorAll("#check_type_alert");//checkbox for filtering Alert, Message, Email
      checkboxes.push(checkbox_alert);

      let checkbox_action = shadowRoot.querySelectorAll("#check_type_action");
      checkboxes.push(checkbox_action);

      let checkbox_message = shadowRoot.querySelectorAll("#check_type_message");
      checkboxes.push(checkbox_message);

      let clear_filter_button = shadowRoot.querySelector("#filter_clear");

      let mark_all_button = shadowRoot.querySelector("#mark_all_btn");//mark all as read button 

      let apply_btn = shadowRoot.querySelector("#apply_btn");// apply filtering button

/** Persist the filter combination in the list */
      if (this.filters.length > 0) {
        checkboxes.forEach(e => {
          if (this.filters.includes(e[0].value)) {
            let elementId = `#check_type_${e[0].value}`;
            let checkBox = shadowRoot.querySelector(elementId);
           checkBox.checked = true;
          }

        })
      }


      /**Events*/
      clear_filter_button.addEventListener('click', () => {
        this.filters = [];
        this.fetchData(this.contactId,shadowRoot)
      })

      apply_btn.addEventListener("click", () => {
        checkboxes.forEach(e => {
          if (e[0].checked) {
            if (!this.filters.includes(e[0].value)) {
              this.filters.push(e[0].value);
            }
          }
        });
        this.Apply_filters(shadowRoot);
      });

      mark_all_button.addEventListener("click", () => {
        this.markAllFlag = !this.markAllFlag;
        this.MarkAllAsRead(shadowRoot);
      })

      elements.forEach(element => {
        element.addEventListener('click', (e) => {
         let item = e.target.value;
          this.MarkAsRead(shadowRoot,item);

        })

      });

      let slider = shadowRoot.querySelector("#slider_read");

      slider.addEventListener('change', async (e) => {
        this.activate_sound = false;
        this.onlyRead = !this.onlyRead;

        if (e.target.checked) {
          /// filter by unread this function is only for frontend
          await this.fetchData(this.contactId, shadowRoot)
        }
        else {
          await this.fetchData(this.contactId, shadowRoot)
        }

      });
      let slider_read = list.querySelector("#slider_read");
      slider_read.addEventListener('change', () => {
        this.switchPosition = !this.switchPosition;
      })
      slider_read.checked = this.switchPosition;
    }
    else {

      list.innerHTML = notFound;

    }

  }
  /**Graphql Call */
  async GraphqlCall(contactId) {
    
    let filters = this.filters;
    let disjunctionFilters = false;
    // let observable$ = Observable.create(async ( observer ) => {
    let filtersArray = [];
    let sortArray = [];
    if (filters.length > 0) {
      disjunctionFilters = true;
      filters.map(filter => {
        filtersArray.push({ col: "jobWorkflow.jobType.name", val: filter, mod: "EQ" })
      })
    }
    filtersArray.push({ col: "contacts.id", val: contactId, mod: "EQ" });

    if (this.onlyRead) {
      filtersArray.push({ col: "status", val: "unread", mod: "EQ" })
    }

    sortArray.push({ col: "startTime", mod: "DES" });

    const graphqlQuery = {
      "query": QUERY,
      "variables": {
        filters: filtersArray,
        sort: sortArray,
        disjunctionFilters: disjunctionFilters,
      }
    };

    const response = await axios.request({
      url: this.endPoint,
      method: 'post',
      headers: headers,
      data: graphqlQuery
    });
    return response.data;
    //         observer.next( response.data );
    //       //  this.data_from_api = response.data;
    //        // observer.complete();

    // } );
    // let subscription = observable$.subscribe( {
    //     next: data => {console.log( '[data] => ', data );return data;},
    //     complete: data => console.log( '[complete]' ),
    // } );

  }
  CalculatePosition(position) {
    let positionValue = -250;
    switch (position) {
      case 'center': return positionValue = positionValue * 1;
      case 'left': return positionValue = positionValue * 2;
      case 'right': return positionValue = positionValue * 0;
      default: return positionValue = -250;
    }

  }
  Apply_filters(shadowRoot) {
    if (this.filters.length > 0) {
      this.fetchData(this.contactId, shadowRoot);
    } else {
      console.log("No filters to apply")
    }

  }

  attributeChangedCallback(field, oldVal, newVal) {
  }
  static get observedAttributes() {
    return ['position']
  }

  // async getData(url, mode, filters) {
  //   if (this.data_from_api !== null) {
  //     return this.data_from_api
  //   }
  //   else return [];
  // }
  Calculate_Received_Time(startTime) {

    let start = new Date(startTime);
    let now = Date.now();
    let difference = now - start;

    let formatted_response = ""

    let differencesInMinutes = difference / 60000;
    let isToday = (differencesInMinutes / 60) < 24 ? true : false;

    if (differencesInMinutes > 60 && (differencesInMinutes / 60) < 24) 
    {

      formatted_response = `${Math.round(differencesInMinutes / 60)} hours ago.`;

    } 
    else if (differencesInMinutes < 60) 
            {

              formatted_response = `${Math.round(differencesInMinutes)} minutes ago.`;

            } 
            else 
            {
              if (Math.round((differencesInMinutes / 60) / 24) > 2) 
              {
                formatted_response = (new Date(startTime)).toLocaleDateString('en-US');
              } 
              else 
              {
                formatted_response = `${Math.round((differencesInMinutes / 60) / 24)} days ago.`;
              }

    }

    return {response:formatted_response, isToday: isToday};
  }


  /**This function throw a notification on the computer  */
  ShowNotification(total_new_notifications) {

    let options = {
      image: 'https://firebasestorage.googleapis.com/v0/b/pizzaswebaplication.appspot.com/o/EBS_Vertical_2.png?alt=media&token=e33e8b6e-3b2c-4ff8-86f5-f73c48235340'
    }
    if (Notification.permission === "granted") {
      // If it's okay let's create a notification
      const notification = new Notification(`You got a ${total_new_notifications} notifications`, options);
    }
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (permission) {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          const notification = new Notification(`You got ${total_new_notifications} notifications`, options);
        }
      });
    }
  }

  MarkAllAsRead(shadowRoot) {
    clearInterval(this.intervalId);

    //ToDo send to backend mutation to update the read status for all items

    shadowRoot.getElementById("total_number").innerHTML = "";

    shadowRoot.getElementById("list-cont").innerHTML = notFound;
    let unmarkBtn = shadowRoot.querySelector("#unmark_btn");
    if (unmarkBtn) {
      unmarkBtn.addEventListener('click', async () => {
        await this.fetchData(this.contactId, shadowRoot)

        this.intervalId = setInterval(async () => // setting a call every 10 seconds, change this approach with Reactive library
          await this.fetchData(this.contactId, shadowRoot),
          30000
        );

      })
    }

  }
  MarkAsRead(shadowRoot,item) {
  
    this.update(shadowRoot, --this.total_number, item);

  }

  async update(shadowRoot, total, item) {

    if (total === 0) {
      let number = shadowRoot.querySelector(".number");
      number.style.cssText = `display : none;`
    }
    shadowRoot.getElementById('total_number').innerHTML = total;
    /** Implement the backend persistance here to update the status **/
    //todo implement the backend update status
   let response =  await this.UpdateStatus(item);
   if(response.data){
    --this.notifications;
    this.fetchData(this.contactId,shadowRoot);
    
  }


  }

 async UpdateStatus(item){
    let objectParse = JSON.parse(item);

    let jobLogObject ={
      id: objectParse.itemId,
      tenantId:1,
      jobWorkflowId:objectParse.workflowId,
      message:{},
      status:"read",
      contactIds:[this.contactId]

    };
    console.log(jobLogObject);

    const graphqlQuery = {
      "query": MUTATION_MODIFY,
      "variables": {
        jobLog: jobLogObject
      }
    };

    const response = await axios.request({
      url: this.endPoint,
      method: 'post',
      headers: headers,
      data: graphqlQuery
    });
  return response;


  }

}


window.customElements.define("ebs-notification", EbsNotification);
