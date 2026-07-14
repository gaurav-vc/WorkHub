import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/config";

export default function Payments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/organizations/payments/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setPayments)
      .catch(console.error);
  }, [token]);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Payment History</h2>
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billing Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.invoice_number}</TableCell>
                  <TableCell>{p.organization_name}</TableCell>
                  <TableCell>${parseFloat(p.amount).toFixed(2)}</TableCell>
                  <TableCell>{p.billing_date}</TableCell>
                  <TableCell>{p.due_date}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'paid' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No payment records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
