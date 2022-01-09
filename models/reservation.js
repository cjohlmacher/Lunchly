/** Reservation for Lunchly */

const moment = require("moment");

const db = require("../db");


/** A reservation for a party */

class Reservation {
  constructor({id, customerId, numGuests, startAt, notes}) {
    this.id = id;
    this.customerId = customerId;
    this.numGuests = numGuests;
    this.startAt = startAt;
    this.notes = notes;
  }

  /** formatter for startAt */

  getformattedStartAt() {
    return moment(this.startAt).format('MMMM Do YYYY, h:mm a');
  }

  get numGuests() {
    return this._numGuests;
  };

  set numGuests(val) {
    if (val < 1) {
      throw Error("Invalid number. Number of guests must be greater than 0")
    } else {
      this._numGuests = val;
    };
  };

  /** given a customer id, find their reservations. */

  static async getReservationsForCustomer(customerId) {
    const results = await db.query(
          `SELECT id, 
           customer_id AS "customerId", 
           num_guests AS "numGuests", 
           start_at AS "startAt", 
           notes AS "notes"
         FROM reservations 
         WHERE customer_id = $1`,
        [customerId]
    );

    return results.rows.map(row => new Reservation(row));
  }

  static async getNextReservationById(customerId) {
    const results = await db.query(
      `SELECT id, 
        customer_id AS "customerId", 
        num_guests AS "numGuests",
        start_at AS "startAt"
      FROM reservations 
      WHERE start_at > $1 AND customer_id = $2
      ORDER BY start_at DESC 
      LIMIT 1`,[moment().format('YYYY-MM-DD'), customerId]
    );
    if (results.rows.length > 0) {
      return new Reservation(results.rows[0]);
    } else {
      return null;
    };
  };

  async save() {
    if (this.id === undefined) {
      const result = await db.query(`
        INSERT INTO reservations
        (customer_id, num_guests, start_at, notes)
        VALUES
        ($1, $2, $3, $4)
        RETURNING id, customer_id, num_guests, start_at, notes`,
        [this.customerId, this.numGuests, this.startAt, this.notes]);
      this.id = result.rows[0].id;
    } else {
      await db.query(`
        UPDATE reservations
        SET customer_id=$1, num_guests=$2, start_at=$3, notes=$4)
        WHERE id=$5`,
        [this.customerId, this.numGuests, this.startAt, this.notes, this.id]);
    }
  }
}


module.exports = Reservation;
