import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type Role = {
    #manager;
    #sales;
    #restorer;
    #woodworker;
    #cleaner;
    #admin;
  };

  type ContactInfo = {
    phone : Text;
    email : Text;
  };

  type Employee = {
    id : Text;
    name : Text;
    role : Role;
    contactInfo : ContactInfo;
  };

  type SaleTransaction = {
    id : Text;
    item : Text;
    quantity : Nat;
    price : Nat;
    customerContact : ContactInfo;
    timestamp : Time.Time;
  };

  type RestorationProject = {
    id : Text;
    description : Text;
    cost : Nat;
    clientContact : ContactInfo;
    assignedEmployee : ?Text;
    status : RestorationStatus;
    completionDate : Time.Time;
    comments : Text;
  };

  type RestorationStatus = {
    #pending;
    #inProgress;
    #completed;
  };

  type CleaningAppointment = {
    id : Text;
    clientName : Text;
    serviceType : ServiceType;
    price : Nat;
    employeeId : Text;
    contact : ContactInfo;
    scheduledTime : Time.Time;
    notes : Text;
    status : CleaningStatus;
  };

  type CleaningStatus = {
    #scheduled;
    #pending;
    #completed;
  };

  type ServiceType = {
    #deepClean;
    #standardClean;
    #upholsteryClean;
    #woodPolishing;
    #other : Text;
  };

  type WorkshopActivity = {
    id : Text;
    type_ : WorkshopType;
    instructor : Text;
    participants : [Participant];
    price : Nat;
    scheduledTime : Time.Time;
    topic : Text;
    details : Text;
  };

  type WorkshopType = {
    #kids;
    #adults;
    #skillLevel;
  };

  type Participant = {
    name : Text;
    contactInfo : ContactInfo;
    registeredAt : Time.Time;
  };

  type RestaurantOrder = {
    id : Text;
    restaurantId : Text;
    tableId : Text;
    tableNumber : Text;
    itemsJson : Text;
    status : Text;
    kitchenStatus : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type MenuSnapshot = {
    restaurantId : Text;
    menuJson : Text;
    timestamp : Int;
  };

  type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  type OldActor = {
    employees : Map.Map<Text, Employee>;
    sales : Map.Map<Text, SaleTransaction>;
    restorationProjects : Map.Map<Text, RestorationProject>;
    cleaningAppointments : Map.Map<Text, CleaningAppointment>;
    workshopActivities : Map.Map<Text, WorkshopActivity>;
  };

  type NewActor = {
    employees : Map.Map<Text, Employee>;
    sales : Map.Map<Text, SaleTransaction>;
    restorationProjects : Map.Map<Text, RestorationProject>;
    cleaningAppointments : Map.Map<Text, CleaningAppointment>;
    workshopActivities : Map.Map<Text, WorkshopActivity>;
    restaurantOrders : Map.Map<Text, RestaurantOrder>;
    restaurantOrderHistory : Map.Map<Text, [RestaurantOrder]>;
    menuSnapshots : Map.Map<Text, MenuSnapshot>;
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    {
      employees = old.employees;
      sales = old.sales;
      restorationProjects = old.restorationProjects;
      cleaningAppointments = old.cleaningAppointments;
      workshopActivities = old.workshopActivities;
      restaurantOrders = Map.empty<Text, RestaurantOrder>();
      restaurantOrderHistory = Map.empty<Text, [RestaurantOrder]>();
      menuSnapshots = Map.empty<Text, MenuSnapshot>();
      userProfiles = Map.empty<Principal, UserProfile>();
    };
  };
};
