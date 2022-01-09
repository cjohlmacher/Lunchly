/** Customer for Lunchly */

const db = require("../db");
const moment = require("moment");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, middleName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.nextReservation = null;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         middle_name AS "middleName",
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    const customerPromises = results.rows.map(async c => {
      const newCustomer =  new Customer(c);
      newCustomer.nextReservation = await newCustomer.getNextReservation();
      return newCustomer;
    });
    return Promise.all(customerPromises);
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",
         middle_name AS "middleName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get the top customers (most reservations) */
  static async best(num) {
    const results = await db.query(`
      SELECT customers.id, 
        first_name AS "firstName",
        middle_name AS "middleName",
        last_name AS "lastName",
        phone, 
        customers.notes
      FROM customers
      JOIN reservations 
      ON customers.id = reservations.customer_id
      GROUP BY customers.id
      ORDER BY COUNT(customers.id) DESC
      LIMIT $1;
    `,[num]);
    return results.rows.map((c) => new Customer(c));
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, middle_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.middleName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, middle_name=$2, last_name=$3, phone=$4, notes=$5
             WHERE id=$6`,
        [this.firstName, this.middleName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  get fullName() {
    const names = [this.firstName, this.middleName, this.lastName];
    return `${names.join(' ')}`;
  };

  async getNextReservation() {
    const nextReservation = await Reservation.getNextReservationById(this.id);
    if (nextReservation) {
      const relativeTime = moment(nextReservation.startAt).fromNow();
      return `Next Reservation: ${relativeTime}`
    } else {
      return null;
    }
  };
}

module.exports = Customer;
