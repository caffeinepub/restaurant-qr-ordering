import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Participant {
    contactInfo: ContactInfo;
    name: string;
    registeredAt: Time;
}
export interface WorkshopActivity {
    id: string;
    participants: Array<Participant>;
    topic: string;
    scheduledTime: Time;
    instructor: string;
    type: WorkshopType;
    details: string;
    price: bigint;
}
export type Time = bigint;
export type ServiceType = {
    __kind__: "deepClean";
    deepClean: null;
} | {
    __kind__: "standardClean";
    standardClean: null;
} | {
    __kind__: "other";
    other: string;
} | {
    __kind__: "woodPolishing";
    woodPolishing: null;
} | {
    __kind__: "upholsteryClean";
    upholsteryClean: null;
};
export interface RestorationProject {
    id: string;
    status: RestorationStatus;
    completionDate: Time;
    cost: bigint;
    description: string;
    comments: string;
    clientContact: ContactInfo;
    assignedEmployee?: string;
}
export interface RestaurantOrder {
    id: string;
    status: string;
    kitchenStatus: string;
    createdAt: bigint;
    tableId: string;
    tableNumber: string;
    restaurantId: string;
    updatedAt: bigint;
    itemsJson: string;
}
export interface MenuSnapshot {
    menuJson: string;
    restaurantId: string;
    timestamp: bigint;
}
export interface CleaningAppointment {
    id: string;
    status: CleaningStatus;
    serviceType: ServiceType;
    contact: ContactInfo;
    clientName: string;
    scheduledTime: Time;
    employeeId: string;
    notes: string;
    price: bigint;
}
export interface SaleTransaction {
    id: string;
    customerContact: ContactInfo;
    item: string;
    timestamp: Time;
    quantity: bigint;
    price: bigint;
}
export interface Employee {
    id: string;
    contactInfo: ContactInfo;
    name: string;
    role: Role;
}
export interface ContactInfo {
    email: string;
    phone: string;
}
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export enum CleaningStatus {
    scheduled = "scheduled",
    pending = "pending",
    completed = "completed"
}
export enum RestorationStatus {
    pending = "pending",
    completed = "completed",
    inProgress = "inProgress"
}
export enum Role {
    manager = "manager",
    admin = "admin",
    sales = "sales",
    cleaner = "cleaner",
    woodworker = "woodworker",
    restorer = "restorer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum WorkshopType {
    kids = "kids",
    adults = "adults",
    skillLevel = "skillLevel"
}
export interface backendInterface {
    addCleaningAppointment(appointment: CleaningAppointment): Promise<void>;
    addEmployee(employee: Employee): Promise<void>;
    addRestorationProject(project: RestorationProject): Promise<void>;
    addSale(sale: SaleTransaction): Promise<void>;
    addWorkshopActivity(activity: WorkshopActivity): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllCleaningAppointments(): Promise<Array<CleaningAppointment>>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllRestorationProjects(): Promise<Array<RestorationProject>>;
    getAllSales(): Promise<Array<SaleTransaction>>;
    getAllWorkshopActivities(): Promise<Array<WorkshopActivity>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCleaningAppointment(id: string): Promise<CleaningAppointment | null>;
    getEmployee(id: string): Promise<Employee | null>;
    getMenuSnapshot(restaurantId: string): Promise<MenuSnapshot | null>;
    getRestaurantOrderHistory(orderId: string): Promise<Array<RestaurantOrder> | null>;
    getRestaurantOrders(restaurantId: string): Promise<Array<RestaurantOrder>>;
    getRestaurantOrdersByStatus(restaurantId: string, status: string): Promise<Array<RestaurantOrder>>;
    getRestorationProject(id: string): Promise<RestorationProject | null>;
    getSale(id: string): Promise<SaleTransaction | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWorkshopActivity(id: string): Promise<WorkshopActivity | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveMenuSnapshot(restaurantId: string, menuJson: string): Promise<void>;
    searchRestaurantOrders(restaurantId: string, searchTerm: string): Promise<Array<RestaurantOrder>>;
    submitRestaurantOrder(order: RestaurantOrder): Promise<void>;
    updateRestaurantOrderStatus(orderId: string, kitchenStatus: string, orderStatus: string): Promise<boolean>;
    uploadFile(metadata: string, file: ExternalBlob): Promise<void>;
}
