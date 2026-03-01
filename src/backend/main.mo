import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  // Types
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

  // Internal Storage
  let employees = Map.empty<Text, Employee>();
  let sales = Map.empty<Text, SaleTransaction>();
  let restorationProjects = Map.empty<Text, RestorationProject>();
  let cleaningAppointments = Map.empty<Text, CleaningAppointment>();
  let workshopActivities = Map.empty<Text, WorkshopActivity>();

  // Authorization helpers
  public shared ({ caller }) func validateAdminOrRole(caller : Principal, requiredRole : Role) {
    let userRole = AccessControl.getUserRole(accessControlState, caller);
    if (userRole != #admin and userRole != requiredRole) {
      Runtime.trap("Not authorized for this action");
    };
  };

  // Core Functions

  // Employee Management
  public shared ({ caller }) func addEmployee(employee : Employee) : async () {
    validateAdminOrRole(caller, #manager);
    employees.add(employee.id, employee);
  };

  public shared ({ caller }) func getEmployee(id : Text) : async ?Employee {
    employees.get(id);
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    employees.values().toArray();
  };

  // Sales Management
  public shared ({ caller }) func addSale(sale : SaleTransaction) : async () {
    validateAdminOrRole(caller, #sales);
    sales.add(sale.id, sale);
  };

  public shared ({ caller }) func getSale(id : Text) : async ?SaleTransaction {
    sales.get(id);
  };

  public query ({ caller }) func getAllSales() : async [SaleTransaction] {
    sales.values().toArray();
  };

  // Restoration Projects
  public shared ({ caller }) func addRestorationProject(project : RestorationProject) : async () {
    validateAdminOrRole(caller, #restorer);
    restorationProjects.add(project.id, project);
  };

  public shared ({ caller }) func getRestorationProject(id : Text) : async ?RestorationProject {
    restorationProjects.get(id);
  };

  public query ({ caller }) func getAllRestorationProjects() : async [RestorationProject] {
    restorationProjects.values().toArray();
  };

  // Cleaning Appointments
  public shared ({ caller }) func addCleaningAppointment(appointment : CleaningAppointment) : async () {
    validateAdminOrRole(caller, #cleaner);
    cleaningAppointments.add(appointment.id, appointment);
  };

  public shared ({ caller }) func getCleaningAppointment(id : Text) : async ?CleaningAppointment {
    cleaningAppointments.get(id);
  };

  public query ({ caller }) func getAllCleaningAppointments() : async [CleaningAppointment] {
    cleaningAppointments.values().toArray();
  };

  // Workshop Activities
  public shared ({ caller }) func addWorkshopActivity(activity : WorkshopActivity) : async () {
    validateAdminOrRole(caller, #manager);
    workshopActivities.add(activity.id, activity);
  };

  public shared ({ caller }) func getWorkshopActivity(id : Text) : async ?WorkshopActivity {
    workshopActivities.get(id);
  };

  public query ({ caller }) func getAllWorkshopActivities() : async [WorkshopActivity] {
    workshopActivities.values().toArray();
  };

  // File Storage
  public shared ({ caller }) func uploadFile(metadata : Text, file : Storage.ExternalBlob) : async () {
    validateAdminOrRole(caller, #manager);
  };
};
