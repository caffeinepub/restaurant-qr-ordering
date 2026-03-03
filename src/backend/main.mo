import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Migration "migration";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run) actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  // User Profile Type (required by frontend)
  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Types for existing functionality (kept for compatibility)
  public type Role = {
    #manager;
    #sales;
    #restorer;
    #woodworker;
    #cleaner;
    #admin;
  };

  public type ContactInfo = {
    phone : Text;
    email : Text;
  };

  public type Employee = {
    id : Text;
    name : Text;
    role : Role;
    contactInfo : ContactInfo;
  };

  public type SaleTransaction = {
    id : Text;
    item : Text;
    quantity : Nat;
    price : Nat;
    customerContact : ContactInfo;
    timestamp : Time.Time;
  };

  public type RestorationProject = {
    id : Text;
    description : Text;
    cost : Nat;
    clientContact : ContactInfo;
    assignedEmployee : ?Text;
    status : RestorationStatus;
    completionDate : Time.Time;
    comments : Text;
  };

  public type RestorationStatus = {
    #pending;
    #inProgress;
    #completed;
  };

  public type CleaningAppointment = {
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

  public type CleaningStatus = {
    #scheduled;
    #pending;
    #completed;
  };

  public type ServiceType = {
    #deepClean;
    #standardClean;
    #upholsteryClean;
    #woodPolishing;
    #other : Text;
  };

  public type WorkshopActivity = {
    id : Text;
    type_ : WorkshopType;
    instructor : Text;
    participants : [Participant];
    price : Nat;
    scheduledTime : Time.Time;
    topic : Text;
    details : Text;
  };

  public type WorkshopType = {
    #kids;
    #adults;
    #skillLevel;
  };

  public type Participant = {
    name : Text;
    contactInfo : ContactInfo;
    registeredAt : Time.Time;
  };

  // Restaurant Order Types
  public type RestaurantOrder = {
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

  public type MenuSnapshot = {
    restaurantId : Text;
    menuJson : Text;
    timestamp : Int;
  };

  // Internal Storage
  let employees = Map.empty<Text, Employee>();
  let sales = Map.empty<Text, SaleTransaction>();
  let restorationProjects = Map.empty<Text, RestorationProject>();
  let cleaningAppointments = Map.empty<Text, CleaningAppointment>();
  let workshopActivities = Map.empty<Text, WorkshopActivity>();
  let restaurantOrders = Map.empty<Text, RestaurantOrder>();
  let restaurantOrderHistory = Map.empty<Text, [RestaurantOrder]>();
  let menuSnapshots = Map.empty<Text, MenuSnapshot>();

  // User Profile Management (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Employee Management (requires admin)
  public shared ({ caller }) func addEmployee(employee : Employee) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add employees");
    };
    employees.add(employee.id, employee);
  };

  public query ({ caller }) func getEmployee(id : Text) : async ?Employee {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view employees");
    };
    employees.get(id);
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view employees");
    };
    employees.values().toArray();
  };

  // Sales Management (requires admin)
  public shared ({ caller }) func addSale(sale : SaleTransaction) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add sales");
    };
    sales.add(sale.id, sale);
  };

  public query ({ caller }) func getSale(id : Text) : async ?SaleTransaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales");
    };
    sales.get(id);
  };

  public query ({ caller }) func getAllSales() : async [SaleTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales");
    };
    sales.values().toArray();
  };

  // Restoration Projects (requires admin)
  public shared ({ caller }) func addRestorationProject(project : RestorationProject) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add restoration projects");
    };
    restorationProjects.add(project.id, project);
  };

  public query ({ caller }) func getRestorationProject(id : Text) : async ?RestorationProject {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view restoration projects");
    };
    restorationProjects.get(id);
  };

  public query ({ caller }) func getAllRestorationProjects() : async [RestorationProject] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view restoration projects");
    };
    restorationProjects.values().toArray();
  };

  // Cleaning Appointments (requires admin)
  public shared ({ caller }) func addCleaningAppointment(appointment : CleaningAppointment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add cleaning appointments");
    };
    cleaningAppointments.add(appointment.id, appointment);
  };

  public query ({ caller }) func getCleaningAppointment(id : Text) : async ?CleaningAppointment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cleaning appointments");
    };
    cleaningAppointments.get(id);
  };

  public query ({ caller }) func getAllCleaningAppointments() : async [CleaningAppointment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cleaning appointments");
    };
    cleaningAppointments.values().toArray();
  };

  // Workshop Activities (requires admin)
  public shared ({ caller }) func addWorkshopActivity(activity : WorkshopActivity) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add workshop activities");
    };
    workshopActivities.add(activity.id, activity);
  };

  public query ({ caller }) func getWorkshopActivity(id : Text) : async ?WorkshopActivity {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view workshop activities");
    };
    workshopActivities.get(id);
  };

  public query ({ caller }) func getAllWorkshopActivities() : async [WorkshopActivity] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view workshop activities");
    };
    workshopActivities.values().toArray();
  };

  // File Storage (requires admin)
  public shared ({ caller }) func uploadFile(metadata : Text, file : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload files");
    };
  };

  // Restaurant QR Anonymous Functionality
  // These functions are intentionally open to anonymous access per requirements

  public shared ({ caller }) func submitRestaurantOrder(order : RestaurantOrder) : async () {
    // No authorization check - anonymous access allowed
    restaurantOrders.add(order.id, order);

    let history = restaurantOrderHistory.get(order.id);
    let newHistory = switch (history) {
      case (null) { [order] };
      case (?existing) {
        existing.concat([order]);
      };
    };
    restaurantOrderHistory.add(order.id, newHistory);
  };

  public query ({ caller }) func getRestaurantOrders(restaurantId : Text) : async [RestaurantOrder] {
    // No authorization check - anonymous access allowed
    var results : [RestaurantOrder] = [];
    for (order in restaurantOrders.values()) {
      if (order.restaurantId == restaurantId) {
        results := results.concat([order]);
      };
    };
    results;
  };

  public query ({ caller }) func getRestaurantOrdersByStatus(restaurantId : Text, status : Text) : async [RestaurantOrder] {
    // No authorization check - anonymous access allowed
    var results : [RestaurantOrder] = [];
    for (order in restaurantOrders.values()) {
      if (order.restaurantId == restaurantId and order.status == status) {
        results := results.concat([order]);
      };
    };
    results;
  };

  public shared ({ caller }) func updateRestaurantOrderStatus(orderId : Text, kitchenStatus : Text, orderStatus : Text) : async Bool {
    // No authorization check - anonymous access allowed (kitchen uses this)
    let orderOpt = restaurantOrders.get(orderId);
    switch (orderOpt) {
      case (null) { false };
      case (?order) {
        let updatedOrder : RestaurantOrder = {
          order with
          status = orderStatus;
          kitchenStatus;
          updatedAt = Time.now();
        };
        restaurantOrders.add(orderId, updatedOrder);

        let history = restaurantOrderHistory.get(orderId);
        let newHistory = switch (history) {
          case (null) { [updatedOrder] };
          case (?existing) {
            existing.concat([updatedOrder]);
          };
        };
        restaurantOrderHistory.add(orderId, newHistory);
        true;
      };
    };
  };

  public shared ({ caller }) func saveMenuSnapshot(restaurantId : Text, menuJson : Text) : async () {
    // No authorization check - anonymous access allowed
    let snapshot : MenuSnapshot = {
      restaurantId;
      menuJson;
      timestamp = Time.now();
    };
    menuSnapshots.add(restaurantId, snapshot);
  };

  public query ({ caller }) func getMenuSnapshot(restaurantId : Text) : async ?MenuSnapshot {
    // No authorization check - anonymous access allowed
    menuSnapshots.get(restaurantId);
  };

  public query ({ caller }) func getRestaurantOrderHistory(orderId : Text) : async ?[RestaurantOrder] {
    // No authorization check - anonymous access allowed
    restaurantOrderHistory.get(orderId);
  };

  public query ({ caller }) func searchRestaurantOrders(restaurantId : Text, searchTerm : Text) : async [RestaurantOrder] {
    // No authorization check - anonymous access allowed
    let searchLower = searchTerm.toLower();
    var results : [RestaurantOrder] = [];

    for (order in restaurantOrders.values()) {
      if (
        order.restaurantId == restaurantId and (
          order.id.toLower().contains(#text(searchLower)) or
          order.tableNumber.toLower().contains(#text(searchLower))
        ) or
        order.status.toLower().contains(#text(searchLower)) or
        order.itemsJson.toLower().contains(#text(searchLower))
      ) {
        results := results.concat([order]);
      };
    };

    results;
  };
};
