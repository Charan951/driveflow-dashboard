import React, { useEffect, useState } from 'react';
import { bookingService, Booking } from '../../services/bookingService';
import { socketService } from '../../services/socket';
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

    // Listen for socket updates
    socketService.connect();
    socketService.on('bookingUpdated', () => {
      fetchPayments();
    });

    return () => {
      socketService.off('bookingUpdated');
    };
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
    <div className="w-full h-full py-4 lg:py-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Payments</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Booking Ref</TableHead>
                    <TableHead className="text-xs sm:text-sm">Description</TableHead>
                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell className="text-xs sm:text-sm">{format(new Date(booking.date), 'PPP')}</TableCell>
                      <TableCell className="font-mono text-xs">{booking.orderNumber ?? booking._id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="max-w-[150px] sm:max-w-none truncate">
                          Service for {typeof booking.vehicle === 'object' ? booking.vehicle.licensePlate : 'Vehicle'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">₹{booking.totalAmount}</TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Badge variant={booking.paymentStatus === 'paid' ? 'success' : booking.paymentStatus === 'failed' ? 'destructive' : 'outline' as any} className="text-xs">
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
