import React, { useEffect, useState } from 'react';
import { bookingService, Booking } from '../../services/bookingService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

const MyPaymentsPage = () => {
  const [payments, setPayments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const bookings = await bookingService.getMyBookings();
      // Filter for bookings that have payment info or are paid
      const paidBookings = bookings.filter(b => b.paymentStatus !== 'pending' || b.totalAmount > 0);
      setPayments(paidBookings);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Payments</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell>{format(new Date(booking.date), 'PPP')}</TableCell>
                      <TableCell className="font-mono text-xs">{booking._id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell>
                        Service for {typeof booking.vehicle === 'object' ? booking.vehicle.licensePlate : 'Vehicle'}
                      </TableCell>
                      <TableCell>₹{booking.totalAmount}</TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Badge variant={booking.paymentStatus === 'paid' ? 'success' : booking.paymentStatus === 'failed' ? 'destructive' : 'outline' as any}>
                          {booking.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPaymentsPage;
